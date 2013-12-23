'use strict';

var conf = require('../conf');
var logger = conf.logger;
var sequelize = require('../models').sequelize;
var settings = require('./settings');
var reindexer = require('./reindexer');
var Lock = require('../locks');
var PgBarrier = require('../locks/pgbarrier');

function PgSyncer (options) {
  if (!(this instanceof PgSyncer)) {
    return new PgSyncer(options);
  }

  this.pgClient = options.pgClient;
  this.esClient = options.esClient;
  this.alias = options.alias;
  this.type = options.type;
  this.table = options.table;
  this.channels = options.channels;

  this.lock = new Lock('pgsyncer-' + this.alias);
  this.reindexBarrier = new PgBarrier(reindexer.getLockNameForAlias(this.alias));
}

function channelToOperation (channel) {
  return channel
    .substring(channel.lastIndexOf('_') + 1)
    .toUpperCase();
}

PgSyncer.prototype.processTruncate = function processTruncate (callback) {
  // do nothing: if someone is running a TRUNCATE, then they can delete the elasticsearch index themselves
  callback(null);
};

PgSyncer.prototype.processInsert = function processInsert (id, callback) {
  // If a record gets modified before we can process it, this causes extra work but is not a consistency issue.
  // The write resulting from the subsequent NOTIFY will be a NOOP

  var pgSyncer = this;
  sequelize
    .query('SELECT * FROM ' + this.table + ' WHERE _id = ?', null, {
      raw: true
    }, [id])
    .complete(function (err, rows) {
      // this can (and often does) return out of order, so processing high volumes of INSERTS can lead to out of order
      // writes
      if (err) {
        callback(err);
        return;
      }

      if (rows.length === 0) {
        // row got deleted before we could process it, the subsequent NOTIFY will take care of it
        return;
      }

      pgSyncer.esClient.index(
        {
          _index: pgSyncer.alias,
          _type: pgSyncer.type,
          _id: id
        },
        rows[0],
        callback);
    });
};

PgSyncer.prototype.processDelete = function processDelete (id, callback) {
  var pgSyncer = this;
  this.esClient.delete(
    {
      _index: this.alias,
      _type: this.type,
      _id: id
    },
    function (err) {
      if (err) {
        if (err.statusCode === 404) {
          logger.warn('Document %s not in index %s', id, pgSyncer.alias);
        } else {
          callback(err);
          return;
        }
      }

      callback(null);
    });
};

PgSyncer.prototype.processUpdate = function processUpdate (payload, callback) {
  var recordIDs;
  try {
    recordIDs = JSON.parse(payload);
  } catch (e) {
    callback(new Error('Invalid payload for UPDATE notification: ' + payload));
    return;
  }

  if (recordIDs.new !== recordIDs.old) {
    // ID changed, need to issue DELETE then PUT
    this.processDelete(recordIDs.old, function (err) {
      if (err) {
        callback(err);
        return;
      }

      this.processInsert(recordIDs.new, callback);
    }.bind(this));
  } else {
    // overwrite existing document
    this.processInsert(recordIDs.new, callback);
  }
};

/**
 * Begin listening for database changes. Listens for the duration of the database connection.
 *
 * Warning: high write volume may cause writes to elasticsearch to happen out of order. Writes during a reindex
 * operation may also happen out of order. To mitgate this, only run reindexing when usage is low.
 *
 * @param ready called when syncing has begun
 */
PgSyncer.prototype.sync = function sync (ready, progressCallback) {
  var pgSyncer = this;
  this.lock.tryLock(function (err, unlockSync) {
    if (err) {
      ready(err);
      return;
    }

    if (!unlockSync) {
      ready(new Error('Failed to acquire ' + pgSyncer.lock.name + ' lock. Is pgsyncer already running for this alias?'));
      return;
    }

    logger.info('Watching database for changes to %s', pgSyncer.alias);

    pgSyncer.pgClient.on('notification', function onNotification (message) {
      logger.debug('Received NOTIFY %s, %s', message.channel, message.payload);

      // prevent reindex while we're processing an update (this doesn't scale, but we're CP)

      pgSyncer.reindexBarrier.await(function (err, done) {
        // All pending NOTIFY operations now proceed in "parallel". However, since Node.js is single-threaded,
        // operations actually run serially (oldest first). However, if I/O (e.g. a DB read) does not return in order,
        // then out of order writes can occur. The alternative would be to wait for each operation to complete before
        // proceeding to the next operation. This would hurt throughput and would still suffer from consistency issues
        // if an operation failed to call the next operation in the chain. Use a dedicated queue if you want
        // guaranteed serializability.
        if (err) {
          process.nextTick(function () {
            unlockSync();
            progressCallback(err);
          });
          return;
        }

        function processOp (op) {
          function cb (err) {
            if (err) {
              logger.error('Error on channel %s, payload %s: %s', message.channel, message.channel, err.stack);
              err.recoverable = true; // errors for individual notifications are recoverable
              progressCallback(err);
              return;
            }

            progressCallback(null);
          }

          if (op === 'TRUNCATE') {
            pgSyncer.processTruncate(cb);
          } else if (op === 'DELETE') {
            pgSyncer.processDelete(message.payload, cb);
          } else if (op === 'UPDATE') {
            pgSyncer.processUpdate(message.payload, cb);
          } else if (op === 'INSERT') {
            pgSyncer.processInsert(message.payload, cb);
          } else {
            logger.error('Unknown operation %s', op);
          }
        }

        // setImmediate is FIFO, process.nextTick is LIFO
        setImmediate(function () {
          processOp(channelToOperation(message.channel));
          done();
        });

        // LISTEN forever...
      });
    });

    pgSyncer.channels.forEach(function (channel) {
      pgSyncer.pgClient.query('LISTEN ' + channel);
    });

    ready(null);
  }.bind(this));
};

module.exports = PgSyncer;

if (!module.parent) {
  settings.getManagedAliases(function (err, aliases) {
    if (err) {
      logger.err(err.stack);
      process.exit(1);
    }

    var Monitor = require('forever-monitor').Monitor;

    aliases.forEach(function (alias) {
      var child = new Monitor(__dirname + '/pgsync_worker.js', {
        max: 3,
        silent: false,
        command: 'node', // workaround https://github.com/nodejitsu/forever-monitor/issues/35
        env: {
          ALIAS: alias
        }
      });

      child.on('start', function () {
        logger.info('pgsync_worker %s started', alias);
      });

      child.on('exit', function () {
        logger.error('pgsync_worker %s died after 3 restarts', alias);
      });

      child.start();
    });
  });
}
