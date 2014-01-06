'use strict';

/**
 * Fair-ish locking with PostgreSQL session-level advisory locks.
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
var pg = require('pg.js');
var conf = require('../conf');
var db = conf.db;
var logger = conf.logger;

// these locks are the best!
var outstandingLocks = {};

function PgLock (name, options) {
  if (!(this instanceof PgLock)) {
    return new PgLock(name);
  }

  this.name = name;
  options = options || {};

  if (_.isNumber(name)) {
    this.id = name;
  } else {
    // this can cause collisions, but it's what
    // https://github.com/mceachen/with_advisory_lock/blob/master/lib/with_advisory_lock/postgresql.rb does
    this.id = crc32.signed(name);
  }

  this.shared = !!options.shared;
}

PgLock.prototype.tryLock = function (callback) {
  this.client = new pg.Client({
    host: db.host,
    database: db.name,
    user: db.username,
    password: db.password,
    port: db.port
  });
  var pgLock = this;

  this.client.connect(function (err) {
    if (err) {
      callback(err);
      return;
    }

    var query = (function () {
      if (pgLock.shared) {
        return 'SELECT pg_try_advisory_lock_shared($1) AS result';
      } else {
        return 'SELECT pg_try_advisory_lock($1) AS result';
      }
    })();

    pgLock.client.query(query, [pgLock.id], function (err, result) {
      if (err) {
        callback(err);
        return;
      }

      if (result.rows[0].result) {
        // we got the lock
        logger.info('Acquired advisory lock %s (%d)', pgLock.name, pgLock.id);
        outstandingLocks[pgLock.id] = pgLock;

        process.nextTick(function () {
          callback(null, pgLock.unlock.bind(pgLock));
        });
      } else {
        // no luck, no lock
        process.nextTick(function () {
          callback(null, null);
        });
      }
    });
  });
};

PgLock.prototype.unlock = function (callback) {
  if (!this.client) {
    // no one called lock()
    callback(null);
    return;
  }

  var query = (function () {
    if (this.shared) {
      return 'SELECT pg_advisory_unlock_shared($1)';
    } else {
      return 'SELECT pg_advisory_unlock($1)';
    }
  }.bind(this))();

  this.client.query(query, [this.id], function (err) {
    this.client.end();
    this.client = null;
    delete outstandingLocks[this.id];

    logger.info('Released advisory lock %s (%d)', this.name, this.id);

    if (err) {
      callback(err);
      return;
    }

    callback(null);
  }.bind(this));
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
