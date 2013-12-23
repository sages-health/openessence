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
