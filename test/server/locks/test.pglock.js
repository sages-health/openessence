'use strict';
/* jshint -W024 */
/* jshint expr:true */

var pg = require('pg');
var expect = require('chai').expect;
var PgLock = require('../../../server/locks/pglock');
var db = require('../../../server/conf').db;

// check if someone has lock
function hasLock (id, callback) {
  pg.connect(
    {
      host: db.host,
      database: db.name,
      user: db.username,
      password: db.password,
      port: db.port
    },
    function (err, client, done) {
      if (err) {
        callback(err);
        return;
      }

      var sql = 'select * from pg_locks where locktype = \'advisory\' and granted = true and objid = $1';
      client.query(sql, [id], function (err, result) {
        done();
        if (err) {
          callback(err);
          return;
        }

        callback(null, result.rows.length > 0);
      });
    });
}

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

  describe('#lock', function () {
    it('should acquire lock', function (done) {
      var lock = new PgLock(1000);
      lock.lock(function (err) {
        if (err) {
          throw err;
        }

        hasLock(1000, function (err, result) {
          if (err) {
            throw err;
          }

          expect(result).to.be.true;

          // release lock for subsequent tests
          lock.unlock();

          done();

        });
      });
    });

    it('should release lock when connection ends', function (done) {
      var lock = new PgLock(1000);
      lock.lock(function (err) {
        if (err) {
          throw err;
        }

        lock.client.end();
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

  describe('#unlock', function () {
    it('should release lock', function (done) {
      var lock = new PgLock(1000);
      lock.lock(function (err) {
        if (err) {
          throw err;
        }

        lock.unlock(function (err) {
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
      lock.lock(function (err) {
        if (err) {
          throw err;
        }

        lock.unlock(function (err) {
          if (err) {
            throw err;
          }

          lock.unlock(function (err) {
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

  describe('#tryLock', function () {
    it('should acquire lock if free', function (done) {
      var lock = new PgLock(1000);
      lock.tryLock(function (err, result) {
        if (err) {
          throw err;
        }

        expect(result).to.be.true;

        lock.unlock();
        done();
      });
    });

    it('should not acquire lock if not free', function (done) {
      var lock = new PgLock(1000);
      lock.lock(function (err) {
        if (err) {
          throw err;
        }

        lock.tryLock(function (err, result) {
          if (err) {
            throw err;
          }

          expect(result).to.be.false;

          lock.unlock();
          done();
        });
      });
    });
  });
});
