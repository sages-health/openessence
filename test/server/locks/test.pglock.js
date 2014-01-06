'use strict';
/* jshint -W024 */
/* jshint expr:true */

var expect = require('chai').expect;
var PgLock = require('../../../server/locks/pglock');

// check if someone has lock

var hasLock = require('./util').hasLock;

describe('pglock', function () {
  // TODO see if DB running

  beforeEach(function noLocksOutstanding (done) {
    hasLock(1000, function (err, result) {
      if (err) {
        throw err;
      }

      expect(result).to.be.false;

      done();
    });
  });

  describe('#tryLock', function () {
    it('should acquire lock if free', function (done) {
      var lock = new PgLock(1000);
      lock.tryLock(function (err, unlock) {
        if (err) {
          throw err;
        }

        expect(unlock).to.exist;

        unlock(function (err) {
          if (err) {
            throw err;
          }

          done();
        });
      });
    });

    it('should not acquire lock if not free', function (done) {
      var lock = new PgLock(1000);
      lock.tryLock(function (err, unlock) {
        if (err) {
          throw err;
        }

        expect(unlock).to.exist;

        lock.tryLock(function (err, unlock2) {
          if (err) {
            throw err;
          }

          expect(unlock2).to.not.exist;

          unlock(function (err) {
            if (err) {
              throw err;
            }

            done();
          });
        });
      });
    });
  });

  describe('#unlock', function () {
    it('should release lock', function (done) {
      var lock = new PgLock(1000);
      lock.tryLock(function (err, unlock) {
        if (err) {
          throw err;
        }

        expect(unlock).to.exist;

        unlock(function (err) {
          if (err) {
            throw err;
          }

          hasLock(1000, function (err, result) {
            if (err) {
              throw err;
            }

            expect(result).to.be.false;

            done();
          });
        });
      });
    });

    it('should not fail if we release lock multiple times', function (done) {
      var lock = new PgLock(1000);
      lock.tryLock(function (err, unlock) {
        if (err) {
          throw err;
        }

        expect(unlock).to.exist;

        unlock(function (err) {
          if (err) {
            throw err;
          }

          unlock(function (err) {
            if (err) {
              throw err;
            }

            hasLock(1000, function (err, result) {
              if (err) {
                throw err;
              }

              expect(result).to.be.false;

              done();
            });
          });
        });
      });
    });
  });

});
