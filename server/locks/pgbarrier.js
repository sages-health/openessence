/**
 * Barrier based on PostgreSQL advisory locks. Multiple callers can `await` on the lock, and then all proceed in
 * parallel once the lock is acquired. There's probably a better name for this, as "Barrier" usually implies all the
 * processes waiting for each other, and not some other resource.
 */
'use strict';

var _ = require('lodash');
var crc32 = require('buffer-crc32');
var pg = require('pg.js');
var conf = require('../conf');
var db = conf.db;
var logger = conf.logger;

var clients = {};

// ID -> ordered list of callbacks to be executed when lock is ready
var lockCallbacks = {};

function PgBarrier (name) {
  if (!(this instanceof PgBarrier)) {
    return new PgBarrier(name);
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

/**
 * Wait for a PostgreSQL advisory lock to be acquired.
 * @param callback called when ready to proceed past barrier
 * @param barrierDoneCallback called when all tasks have finished
 */
PgBarrier.prototype.await = function await (callback, barrierDoneCallback) {
  barrierDoneCallback = barrierDoneCallback || function (err) {
    if (err) {
      logger.err(err.stack);
    }
  };

  if (lockCallbacks[this.id]) {
    lockCallbacks[this.id].push(callback);
  } else {
    lockCallbacks[this.id] = [callback];
  }

  if (clients[this.id]) {
    // we're already waiting
    return;
  }

  // don't use connection pool, we need our own session for the session-level lock
  clients[this.id] = new pg.Client({
    host: db.host,
    database: db.name,
    user: db.username,
    password: db.password,
    port: db.port
  });

  var pgBarrier = this;

  clients[this.id].connect(function (err) {
    if (err) {
      callback(err);
      return;
    }

    clients[pgBarrier.id].query('SELECT pg_advisory_lock($1) AS result', [pgBarrier.id], function (err) {
      if (err) {
        callback(err);
        return;
      }

      var referenceCount = 0;

      // call each callback
      lockCallbacks[pgBarrier.id].forEach(function (cb, index, array) {
        setImmediate(function () {
          cb(null, _.once(function done () {
            referenceCount++;
            if (referenceCount === array.length) {
              pgBarrier.unlock(barrierDoneCallback);
            }
          }));
        });
      });
    });
  });
};

/**
 * Release PostgreSQL lock.
 */
PgBarrier.prototype.unlock = function unlock (callback) {
  delete lockCallbacks[this.id];

  clients[this.id].query('SELECT pg_advisory_unlock($1)', [this.id], function (err) {
    clients[this.id].end();
    delete clients[this.id];

    if (err) {
      callback(err);
      return;
    }

    callback(null);

  }.bind(this));
};

module.exports = PgBarrier;
