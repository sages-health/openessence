'use strict';

/**
 * Locking with PostgreSQL session-level advisory locks.
 *
 * PG session-level advisory locks are automatically released
 * when a session ends. This means deadlock can happen if a session doesn't end. This can happen if a connection
 * is terminated improperly, e.g. because there was an uncaught, unrecoverable exception. (Node is very good about
 * closing TCP connections on process.exit. However, it sometimes fails to if the process dies because of an
 * unrecoverable error, e.g. a ReferenceError). If client dies suddenly while holding an advisory lock, the session
 * can get stuck in an "idle in transaction" state. To mitigate this, proxy connections through pgBouncer
 * (which you should be doing anyway) and set idle_transaction_timeout (available in pgBouncer 1.5+). For more info,
 * see http://stackoverflow.com/a/13245020.
 *
 * If you do encounter deadlock from an idle transaction, the only thing you can do (I think) is kill the backend.
 * It would be nice if you could just unlock the held lock, but since you're unlocking it from a different session,
 * it will have no effect.
 *
 * You can kill all backends with an outstanding advisory lock with
 *
 *     select pg_terminate_backend(pid) from
 *     (select pid from pg_locks where locktype = 'advisory' and granted = true) t.
 *
 */

var _ = require('lodash');
var crc32 = require('buffer-crc32');
var pg = require('pg');
var conf = require('../conf');
var db = conf.db;
var logger = conf.logger;

var outstandingLocks = {};

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

    client.query('SELECT pg_try_advisory_lock($1) AS result', [pgLock.id], function (err, result) {
      if (err) {
        callback(err);
        return;
      }

      logger.info('Acquired advisory lock %d', pgLock.id);
      outstandingLocks[pgLock.id] = pgLock;

      if (result.rows[0].result) {
        callback(null, pgLock.unlock.bind(pgLock));
      } else {
        callback(null, null);
      }
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
    client.query('SELECT pg_advisory_lock($1)', [pgLock.id], function (err) {
      if (err) {
        callback(err);
        return;
      }

      logger.info('Acquired advisory lock %d', pgLock.id);
      outstandingLocks[pgLock.id] = pgLock;

      callback(null, pgLock.unlock.bind(pgLock));
    });
  });
};

PgLock.prototype.unlock = function (callback) {
  if (this.client) { // check if caller ever actually locked
    // "Once acquired at session level, an advisory lock is held until explicitly released or the session ends"

    // not necessary to unlock if we close connection
    // this.client.query('SELECT pg_advisory_unlock($1)', [this.id]);

    this.client.end();
    logger.info('Released advisory lock %d', this.id);
    delete outstandingLocks[this.id];
  }
  if (callback) {
    callback(null);
  }
};

// one exit handler (as opposed to one per lock) to avoid memory leaks
process.on('exit', function () {
  // not sure if this helps at all (it definitely won't if the process is SIGKILL-ed),
  // but it's what https://github.com/isaacs/lockfile/blob/d75e7119c7/lockfile.js#L33 does
  // (of course he's dealing with files that won't get deleted otherwise...)
  Object.keys(outstandingLocks).forEach(function (id) {
    outstandingLocks[id].unlock();
  });
});

module.exports = PgLock;
