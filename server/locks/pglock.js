'use strict';

var _ = require('lodash');
var crc32 = require('buffer-crc32');
var pg = require('pg');
var conf = require('../conf');
var db = conf.db;
var logger = conf.logger;

function PgLock (name) {
  if (!(this instanceof PgLock)) {
    return new PgLock(name);
  }

  this.name = name;

  if (_.isNumber(name)) {
    this.id = name;
  } else {
    // this can cause collisions, but it's what
    // https://github.com/mceachen/with_advisory_lock/blob/master/lib/with_advisory_lock/postgresql.rb does
    this.id = crc32.signed(name);
  }
}

function createClient () {
  // don't use connection pool, we need our own session for the session-level lock
  return new pg.Client({
    host: db.host,
    database: db.name,
    user: db.username,
    password: db.password,
    port: db.port
  });
}

PgLock.prototype.tryLock = function (callback) {
  var client = createClient();
  this.client = client;
  var pgLock = this;

  client.connect(function (err) {
    if (err) {
      callback(err);
      return;
    }

    // TODO prepared statement
    client.query('SELECT pg_try_advisory_lock(' + pgLock.id + ') AS result', function (err, result) {
      if (err) {
        callback(err);
        return;
      }

      callback(null, result.rows[0].result);
    });
  });
};

PgLock.prototype.lock = function (callback) {
  var client = createClient();
  this.client = client;
  var pgLock = this;

  client.connect(function (err) {
    if (err) {
      callback(err);
      return;
    }

    // this acquires an exclusive lock, in the future, we may want to also support shared locks
    client.query('SELECT pg_advisory_lock(' + pgLock.id + ')', function (err) {
      if (err) {
        callback(err);
        return;
      }

      logger.info('Acquired advisory lock %d', pgLock.id);
      callback(null);
    });
  });
};

PgLock.prototype.unlock = function (callback) {
  if (this.client) { // check if caller ever actually locked
    // "Once acquired at session level, an advisory lock is held until explicitly released or the session ends"

    // not necessary to unlock if we close connection
    // this.client.query('SELECT pg_advisory_unlock(' + this.id + ')');

    this.client.end();
  }
  if (callback) {
    callback(null);
  }
};

module.exports = PgLock;
