'use strict';

var chai = require('chai');
chai.use(require('sinon-chai'));
var expect = chai.expect;
var nock = require('nock');

var Model = require('../../../server/codex/model');
var conf = require('../../../server/conf');

describe('model', function () {
  afterEach(function () {
    nock.cleanAll();
  });

  describe('putMapping()', function () {
    var scope;
    var model;
    beforeEach(function (done) {
      scope = nock(conf.elasticsearch.host)
        .put('/foo/_mapping/bar', {
          bar: {
            type: 'string'
          }
        })
        .reply(200, {
          acknowledged: true
        });

      model = new Model({
        index: 'foo',
        type: 'bar',
        mapping: {
          type: 'string'
        }
      });

      done();
    });

    it('should handle optional arguments', function (done) {
      model.indices.putMapping(function (err) {
        if (err) {
          done(err);
          return;
        }

        expect(scope.isDone()).to.be.true;
        done();
      });
    });

    it('should work if passed null', function (done) {
      model.indices.putMapping(null, function (err) {
        if (err) {
          done(err);
          return;
        }

        expect(scope.isDone()).to.be.true;
        done();
      });
    });
  });
});
