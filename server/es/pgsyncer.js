'use strict';

var pg = require('pg');
var conf = require('../conf');
var logger = conf.logger;
var sequelize = require('../models').sequelize;
var elasticsearch = require('es');
var settings = require('./settings');

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
  sequelize // TODO use async.queue and don't dequeue while re-indexing is running
    .query('SELECT * FROM ' + this.table + ' WHERE _id = ?', null, { // TODO redis pub/sub for notification?
      raw: true
    }, [id])
    .complete(function (err, rows) {
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
 * @param callback called for *every* error encountered
 */
PgSyncer.prototype.sync = function sync (callback) {
  logger.info('Watching database for changes');

  var pgSyncer = this;
  this.pgClient.on('notification', function onNotification (message) {
    logger.debug('Received NOTIFY %s, %s', message.channel, message.payload);

    var op = channelToOperation(message.channel);

    function cb (err) {
      if (err) {
        logger.error('Error on channel %s, payload %s: %s', message.channel, message.channel, err.stack);
        callback(err);
      }
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
  });

  pgSyncer.channels.forEach(function (channel) {
    pgSyncer.pgClient.query('LISTEN ' + channel);
  });
  // LISTEN forever...
};

module.exports = PgSyncer;

if (!module.parent) {
  var db = conf.db;

  var Lock = require('../locks');
  var lock = new Lock('pgsync');
  lock.tryLock(function (err, result) {
    if (err) {
      logger.error(err.stack);
      process.exit(1);
    }

    if (!result) {
      logger.warn('Failed to acquire %s lock. Is pgsyncer already running?', lock.name);
      process.exit(1);
    }

    settings.getManagedAliases(function (err, aliases) {
      if (err) {
        logger.err(err.stack);
        process.exit(1);
      }

      aliases.forEach(function (alias) {
        pg.connect(
          {
            host: db.host,
            database: db.name,
            user: db.username,
            password: db.password,
            port: db.port
          },
          function (err, client) {
            // third parameter to this func is callback to release connection, but we LISTEN forever

            if (err) {
              logger.error(err.stack);
              process.exit(1);
            }

            var esClient = elasticsearch({
              server: {
                host: conf.es.host,
                port: conf.es.port
              }
            });

            var aliasSettings = settings.loadIndexSettings(alias);

            new PgSyncer({
              pgClient: client,
              esClient: esClient,
              alias: alias,
              type: aliasSettings.type,
              table: aliasSettings.table,
              channels: aliasSettings.channels
            }).sync(function (err) {
              if (err) { // TODO call sync forever
                logger.error(err.stack);
              }
            });
          });
      });
    });
  });
}
