'use strict';
/* jshint -W024 */
/* jshint expr:true */

var pg = require('pg');
var expect = require('chai').expect;
var sinon = require('sinon');
var PgBarrier = require('../../../server/locks/pgbarrier');
var Lock = require('../../../server/locks');
var db = require('../../../server/conf').db;
var hasLock = require('./util').hasLock;

describe('pgbarrier', function () {
  beforeEach(function noLocksOutstanding (done) {
    hasLock(1158, function (err, result) {
      if (err) {
        throw err;
      }

      expect(result).to.be.false;

      done();
    });
  });

  describe('#await', function () {
    var barrier;

    beforeEach(function () {
      barrier = new PgBarrier(1158);
    });

    it('done callback should exist', function (done) {
      barrier.await(function (err, doneBarrier) {
        if (err) {
          throw err;
        }

        expect(doneBarrier).to.exist;
        doneBarrier();

        done();
      });
    });

    it('should wait until lock is free', function (done) {
      new Lock(barrier.name).tryLock(function (err, unlock) {
        if (err) {
          throw err;
        }

        unlock = sinon.spy(unlock);

        barrier.await(function (err, doneBarrier) {
          if (err) {
            throw err;
          }

          expect(unlock).to.have.been.called;

          doneBarrier();
          done();
        });

        unlock(function (err) {
          if (err) {
            throw err;
          }
        });
      });
    });

    it('should execute callbacks in order', function (done) {
      new Lock(barrier.name).tryLock(function (err, unlock) {
        if (err) {
          throw err;
        }

        var await1 = sinon.spy(function (err, doneBarrier) {
          if (err) {
            throw err;
          }

          doneBarrier();
        });

        barrier.await(await1);
        barrier.await(function (err, doneBarrier) {
          if (err) {
            throw err;
          }

          expect(await1).to.have.been.called;
          doneBarrier();
          done();
        });

        unlock(function (err) {
          if (err) {
            throw err;
          }
        });
      });
    });
  });
});
