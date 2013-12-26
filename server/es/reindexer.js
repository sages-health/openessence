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
var elasticsearch = require('es');
var conf = require('../conf');
var logger = conf.logger;
var Lock = require('../locks');
var settings = require('./settings');

// Mask for index names: name-ID, e.g. foo-1386709830584.
// ID doesn't have to be a timestamp, that's just the easiest way to have (mostly)
// monotonically increasing IDs.
var INDEX_REGEX = /^(.+)-(\d+)$/;

// TODO turn this into a class

exports.getRiverNameFromIndexName = function getRiverNameFromAliasName (name) {
  return name + '-river';
};

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

/**
 * Creates a JDBC river for the specified index.
 */
exports.createJdbcRiver = function createJdbcRiver (indexName, client, callback) {
  var alias = exports.getAliasNameFromIndexName(indexName);
  var indexSettings = settings.loadIndexSettings(alias);
  var riverSettings = {
    type: 'jdbc',
    jdbc: {
      driver: 'org.postgresql.Driver',
      url: conf.db.url,
      user: conf.db.username,
      password: conf.db.password,
      strategy: 'oneshot',
      sql: indexSettings.reIndexSql || 'SELECT * FROM ' + indexSettings.table
    },
    index: {
      index: indexName,
      type: indexSettings.type,
      'bulk_size': 4096 // default is 100
    }
  };

  var name = exports.getRiverNameFromIndexName(indexName);

  client.cluster.putRiver(
    {
      name: name,
      refresh: true
    },
    riverSettings,
    function (err, response) {
      if (err) {
        callback(err);
        return;
      }

      callback(null, {
        _type: name,
        response: response
      });
    });
};

exports.deleteJdbcRiver = function deleteJdbcRiver (indexName, client, callback) {
  client.delete({
    _index: '_river',
    _type: exports.getRiverNameFromIndexName(indexName),
    refresh: true
  }, function (err, response) {
    if (err) {
      if (err.statusCode === 404) {
        logger.info('Didn\'t delete JDBC river for %s because it doesn\'t exist', indexName);
      } else {
        callback(err);
        return;
      }
    }

    callback(null, response);
  });
};

exports.isJdbcRiverActive = function isJdbcRiverActive (indexName, esClient, callback) {
  esClient.get({
    _index: '_river',
    _type: exports.getRiverNameFromIndexName(indexName),
    _id: '_custom'
  }, function (err, response) {
    if (err) {
      if (err.statusCode === 404) {
        // can't be running if it's not there
        logger.info('JDBC River not found for index %s', indexName);
        callback(null, false);
        return;
      }
      callback(err);
      return;
    }

    try {
      callback(null, response._source.jdbc.active);
    } catch (e) {
      // Unexpected response
      callback(e);
    }
  });
};

exports.getLockNameForAlias = function (alias) {
  return 'reindex-' + alias;
};

// See https://groups.google.com/forum/#!topic/elasticsearch/WvtnHZlPqsY for why we wait
exports.waitUntilJdbcRiverInactive = function waitUntilJdbcRiverInactive (index, esClient, callback) {
  var name = exports.getRiverNameFromIndexName(index);
  logger.info('Waiting until JDBC River %s is inactive', name);
  var attempts = 0;

  function loop (err, active) {
    if (err) {
      callback(err);
      return;
    }

    if (!active) {
      logger.info('JDBC River %s is now inactive', name);
      callback(null, true);
    } else {
      if (attempts >= 5) {
        callback(new Error('Timed out waiting for JDBC River %s job to stop', name));
        return;
      }

      // wait 1 second, then 10 seconds, then 100, then 1,000, then 10,000
      var waitSeconds = Math.pow(10, attempts);
      attempts++;

      logger.info('JDBC River %s still active, waiting %ds before checking again', name, waitSeconds);

      setTimeout(function () {
        exports.isJdbcRiverActive(index, esClient, loop);
      }, waitSeconds * 1000);
    }
  }

  exports.isJdbcRiverActive(index, esClient, loop);
};

function doReIndex (alias, callback) {
  var esClient = elasticsearch({
    server: {
      host: conf.es.host,
      port: conf.es.port
    }
  });

  var newIndex;

  async.waterfall([
    function (callback) {
      logger.info('Creating new index for %s', alias);
      exports.createIndex(alias, esClient, callback);
    },
    function (result, callback) {
      newIndex = result._index;
      logger.info('Created new index %s', newIndex);
      callback(null, newIndex);
    },
    // TODO ditch river and push data ourselves with https://github.com/brianc/node-pg-query-stream (requires converting result set -> JSON ourselves)
    function (result, callback) {
      logger.info('Creating new JDBC river for %s', newIndex);
      exports.createJdbcRiver(newIndex, esClient, callback);
    },
    function (result, callback) {
      logger.info('Waiting 10s for %s river to activate', newIndex);
      setTimeout(function () {
        exports.waitUntilJdbcRiverInactive(newIndex, esClient, callback);
      }, 10000); // TODO check doc count on index, if > 0 then river has started
    },
    function (result, callback) {
      logger.info('Moving %s alias to new index', alias);
      require('./move_alias')(alias, newIndex, esClient, callback);
    },
    function cleanup (result, callback) {
      var Cleaner = require('./clean');
      var cleaner = new Cleaner(alias, esClient);
      async.series([cleaner.deleteOldRivers.bind(cleaner), cleaner.deleteOldIndices.bind(cleaner)], callback);
    }
  ], function (err, result) {
    if (err) {
      logger.error('Error re-indexing %s: %s', alias, err.stack);
      callback(err);
    } else {
      callback(null, result);
    }
  });
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
 * 2. River types. To avoid accidentally deleting a JDBC river while it's running, the re-indexer does not delete old
 * rivers types as aggressively. You may want to manually delete old JDBC river types yourself, or drop the entire
 * `_river` index (it will be created again from scratch the next time re-indexing runs).
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
        lock.unlock(function (unlockErr) {
          if (unlockErr) {
            callback(unlockErr);
            return;
          }

          if (err) {
            callback(err);
            return;
          }

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
        });
      }
    });
  });
}



