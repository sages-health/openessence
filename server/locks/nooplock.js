/**
 * Lock that always succeeds.
 */
'use strict';

function NoopLock () {
  // do nothing (duh)
}

NoopLock.prototype.tryLock = function tryLock (callback) {
  process.nextTick(function () {
    callback(null, this.unlock.bind(this));
  }.bind(this));
};

NoopLock.prototype.lock = NoopLock.prototype.tryLock;

NoopLock.prototype.unlock = function unlock (callback) {
  if (callback) {
    process.nextTick(function () {
      callback(null);
    });
  }
};

module.exports = NoopLock;
