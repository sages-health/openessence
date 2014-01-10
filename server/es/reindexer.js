/**
 * Collection of functions to help with re-indexing elasticsearch indices. The most important function for clients
 * is `reIndex(alias, callback)` which actually performs the re-indexing of a given alias. All other functions are
 * exported in the hopes that they are useful primitives supporting similar operations.
 *
 * The general re-indexing strategy is inspired by
 * http://www.elasticsearch.org/blog/changing-mapping-with-zero-downtime
 */
'use strict';

var _ = require('lodash');
var async = require('async');
var elasticsearch = require('es'); // TODO use official JS client: https://github.com/elasticsearch/elasticsearch-js
var util = require('util');
var pg = require('pg.js');
var QueryStream = require('pg-query-stream');
var stream = require('stream');
var BatchStream = require('batch-stream');
var Promise = require('bluebird');
var conf = require('../conf');
var db = conf.db;
var logger = conf.logger;
var Lock = require('../locks');
var settings = require('./settings');
var Cleaner = require('./clean');
var moveAlias = require('./move_alias');

// Mask for index names: name-ID, e.g. foo-1386709830584.
// ID doesn't have to be a timestamp, that's just the easiest way to have (mostly)
// monotonically increasing IDs.
var INDEX_REGEX = /^(.+)-(\d+)$/;

// TODO turn this into a class

exports.createIndex = function createIndex (aliasName, client, callback) {
  var index = settings.loadIndexSettings(aliasName).index;
  if (!index.settings) {
    index.settings = {
      // see http://www.elasticsearch.org/guide/en/elasticsearch/reference/current/indices-update-settings.html#bulk
      'refresh_interval': '-1'
    };
  }
  var indexName = aliasName + '-' + Date.now();
  client.indices.createIndex({
    _index: indexName
  }, index, function (err, response) {
    if (err) {
      callback(err);
    } else {
      callback(null, {
        _index: indexName,
        response: response
      });
    }
  });
};

/**
 * Extracts the name of the alias from the name of an index. This function only looks at the index name, and
 * does *not* query elasticsearch, so there are no guarantees that the returned alias name is actually backed by the
 * given index.
 *
 * @param indexName name of the index
 */
exports.getAliasNameFromIndexName = function getAliasNameFromIndexName (indexName) {
  var result = INDEX_REGEX.exec(indexName);
  if (result) {
    return result[1];
  } else {
    throw new Error('Index name ' + indexName + ' does not match ' + INDEX_REGEX.source);
  }
};

exports.getDateFromIndexName = function getDateFromIndexName (indexName) {
  var result = INDEX_REGEX.exec(indexName);
  if (result) {
    return new Date(parseInt(result[2], 10));
  } else {
    throw new Error('Index name ' + indexName + ' does not match ' + INDEX_REGEX.source);
  }
};

/**
 * Returns an array of indices that correspond to the given alias, assuming standard index-alias naming conventions.
 * For example, if the cluster contains indices `er-1`, `er-2`, and `otc-1`, and alias `er`,
 * `getIndicesForAlias('er', ...)` would return `[er-1, er-2]`.
 */
exports.getIndicesForAlias = function getIndicesForAlias (aliasName, esClient, callback) {
  esClient.cluster.state({}, function (err, response) {
    if (err) {
      callback(err);
      return;
    }

    var indices = _.filter(Object.keys(response.metadata.indices), function (indexName) {
      return INDEX_REGEX.test(indexName) && exports.getAliasNameFromIndexName(indexName) === aliasName;
    });

    callback(null, indices);
  });
};

function getMaxIndex (indices) {
  return _.max(indices, function (indexName) {
    return exports.getDateFromIndexName(indexName).getTime();
  });
}

/**
 * Returns name of latest index for given alias. This is not necessarily the index that's being used by the alias,
 * just the one with the greatest timestamp.
 */
exports.getLatestIndex = function getLatestIndex (aliasName, esClient, callback) {
  exports.getIndicesForAlias(aliasName, esClient, function (err, indices) {
    if (err) {
      return callback(err);
    }

    return callback(null, getMaxIndex(indices));
  });
};

/**
 * Returns array of old indices for a given alias. For example, if a cluster contains indices `er-1`, `er-2`, and
 * `er-3`, then `getOldIndices('er', ...)` would return `[er-2, er-3]`. More formally, `getOldIndices(a, x, c)` +
 * `getLatestIndex(a, x, d)` = `getIndicesForAlias(a, x, e)`.
 */
exports.getOldIndices = function getOldIndices (aliasName, esClient, callback) {
  exports.getIndicesForAlias(aliasName, esClient, function (err, indices) {
    if (err) {
      return callback(err);
    }

    var latestIndex = getMaxIndex(indices);
    var oldIndices = _.filter(indices, function (index) {
      return index !== latestIndex;
    });

    return callback(null, oldIndices);
  });
};

/**
 * Return the name of the index that an alias points to. Note that this method does not make any assumptions about
 * standard index-alias naming conventions, and instead directly queries elasticsearch.
 */
exports.getIndexForAlias = function getIndexForAlias (alias, esClient, callback) {
  // node-es has no API for GET /_aliases, so use /_cluster/state instead
  esClient.cluster.state({}, function (err, response) {
    if (err) {
      return callback(err);
    }

    var allIndices = response.metadata.indices;
    var indices =  _
      .filter(Object.keys(allIndices), function (indexName) {
        return _.contains(allIndices[indexName].aliases, alias);
      });

    if (indices.length > 1) {
      return callback(new Error('Multiple indices found for ' + alias));
    } else if (indices.length === 0) {
      return callback(null, null);
    }

    return callback(null, indices[0]);
  });
};

exports.getLockNameForAlias = function (alias) {
  return 'reindex-' + alias;
};

/**
 * Stream to write to an elasticsearch index
 * @param client Elasticsearch.js client
 */
function ElasticsearchWritableStream (client, index, type) {
  if (!(this instanceof ElasticsearchWritableStream)) {
    return new ElasticsearchWritableStream(client, index, type);
  }

  ElasticsearchWritableStream.super_.call(this, {
    objectMode: true,
    highWaterMark: 16 // default in nodejs-master
  });

  this.client = client;
  this.index = index;
  this.type = type;
}
util.inherits(ElasticsearchWritableStream, stream.Writable);

ElasticsearchWritableStream.prototype._write = function _write (chunk, encoding, callback) {
  var stream = this;
  var body = _.flatten(chunk.map(function (doc) {
    var document = doc[stream.type];

    return [
      // operation
      {
        index: {
          // these are passed on URL (and passing _index would break if allow_explicit_index is disabled)
//          _index: stream.index,
//          _type: stream.type

          // if you don't provide an _id here, elasticsearch tries to generate one for you
          _id: document._id
        }
      },
      // data to index
      document
    ];
  }), true);

  this.client.bulk({
    index: this.index,
    type: this.type,
    body: body
  }, function (err) {
    if (err) {
      callback(err);
    } else {
      callback(null);
    }
  });
};

function doReIndex (alias, callback) {
  var esClient = elasticsearch({
    server: {
      host: conf.es.host,
      port: conf.es.port
    }
  });

  var indexSettings = settings.loadIndexSettings(alias);
  logger.info('Creating new index for %s', alias);

  return Promise.promisify(exports.createIndex)(alias, esClient)
    .then(function moveData (result) {
      var newIndex = result._index;
      logger.info('Created new index %s', newIndex);

      return Promise.promisify(pg.connect, pg)({
        host: db.host,
        database: db.name,
        user: db.username,
        password: db.password,
        port: db.port
      })
        .spread(function streamData (client, done) {
          var query = indexSettings.reIndexSql || 'SELECT * FROM ' + indexSettings.table;
          var resolver = Promise.defer();

          logger.info('Piping hot data into %s', newIndex);
          var stream = client.query(new QueryStream(query))
            .pipe(new BatchStream({
              size: 1024
            }))
            .pipe(new ElasticsearchWritableStream((function () {
              return new (require('elasticsearch').Client)({
                host: {
                  host: conf.es.host,
                  port: conf.es.port
                },
                log: 'info'
              });
            })(), newIndex, indexSettings.type));

          stream.on('error', function (err) {
            done();
            resolver.reject(err);
          });
          stream.on('finish', function () {
            logger.info('Stream finished');
            done();
            resolver.resolve();
          });

          return resolver.promise;
        })
        .return(newIndex);
    })
    .then(function move (newIndex) {
      logger.info('Moving %s alias to new index %s', alias, newIndex);
      return Promise.promisify(moveAlias)(alias, newIndex, esClient);
    })
    .then(function cleanup () {
      var cleaner = new Cleaner(alias, esClient);
      return Promise.promisify(cleaner.deleteOldIndices, cleaner)();
    })
    .nodeify(callback);
}

/**
 * Re-index data online. Inspired by http://www.elasticsearch.org/blog/changing-mapping-with-zero-downtime/.
 * Go read that link before continuing.
 *
 * Note that since elasticsearch doesn't have client-usable transactions, race conditions can happen during
 * re-indexing. Most of the time, a race condition will only cause a temporary consistency issue, i.e. moving
 * the alias to an index that's not ready yet. Such issues should be corrected when re-indexing is run again.
 * However, to prevent anything more serious from happening, you should avoid doing a few things while the
 * re-indexing is running:
 * 1. Don't create new indices that could confuse the re-indexing job. For example, if you're trying to re-index
 * alias `foo` from `foo-1` to `foo-2`, don't create index `foo-3`. Doing such a silly thing can cause the re-indexing
 * to move `foo` to `foo-3`, even if `foo-3` doesn't have all your data. Creating indices that the re-indexing will
 * ignore is of course fine, e.g. creating `bar-1` shouldn't cause a problem.
 * 2. Don't delete indices the re-indexer is using. This should be obvious.
 * 3. Don't modify the alias the re-indexer is using. This actually might be OK, but why would you want to test this?
 *
 * Doing anything else while the re-indexer is running is probably fine, but be careful.
 *
 * This function cleans up after itself, but if anything goes wrong, here's the list of things you might want to
 * manually delete from your cluster:
 * 1. Old indices. Normally, all old indices for an alias are deleted after the alias is moved. If something bad
 * happens and they're not deleted, you may want to delete them manually.
 */
exports.reIndex = function reIndex (alias, callback) {
  var lock = new Lock(exports.getLockNameForAlias(alias)); // prevent more than one alias-job from running at a time
  lock.tryLock(function (err, unlock) {
    if (err) {
      callback(err);
      return;
    }

    function run () {
      doReIndex(alias, function (err, result) {
        if (err) {
          logger.error('Error re-indexing %s: %s', alias, err.stack);
        }
        lock.unlock(function (unlockErr) {
          if (unlockErr) {
            callback(unlockErr);
            return;
          }

          if (err) {
            callback(err);
            return;
          }

          logger.info('Done re-indexing %s', alias);
          callback(null, result);
        });
      });
    }

    if (unlock) {
      run();
    } else {
      // wait for a little and try again
      var retry = Math.random() * (10000 - 1000) + 1000; // random time to help prevent herds
      logger.info('Failed to acquire %s lock. Trying again in %d ms', lock.name, retry);
      setTimeout(function () {
        lock.tryLock(function (err, unlock) {
          if (err) {
            callback(err);
            return;
          }

          if (!unlock) {
            logger.warn('Failed to acquire %s lock. Is a re-indexer job for this alias already running?', lock.name);
            callback(new Error('Failed to acquire re-index lock'));
            return;
          }

          run();
        });
      }, retry);
    }
  });
};

if (!module.parent) {
  settings.getManagedAliases(function (err, aliases) {
    if (err) {
      throw err;
    }

    async.series(_.map(aliases, function (alias) {
      return function (callback) {
        exports.reIndex(alias, callback);
      };
    }), function (err) {
      if (err) {
        throw err;
      } else {
        process.nextTick(function () {
          // wait for nextTick so any callbacks in reIndex can be called first
          logger.info('Done re-indexing');
          process.exit();
        });
      }
    });
  });
}



