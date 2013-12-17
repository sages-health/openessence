/**
 * Code for locking tests that need to be run in a separate process.
 */
'use strict';

var PgLock = require('../../../../server/locks/pglock');

var lock = new PgLock(1000);
lock.lock(function (err) {
  if (err) {
    throw err;
  }
  process.send('locked');
});

// ensure we don't terminate until parent kills us
process.on('message', function () {
 // do nothing
});

