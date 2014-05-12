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

  describe('exists()', function () {
    var scope;
    var model;
    beforeEach(function (done) {
      scope = nock(conf.elasticsearch.host)
        .head('/foo')
        .reply(200);

      model = new Model({
        index: 'foo',
        type: 'bar'
      });

      done();
    });

    it('should handle optional arguments', function (done) {
      model.index.exists(function (err) {
        if (err) {
          done(err);
          return;
        }

        expect(scope.isDone()).to.be.true;
        done();
      });
    });

    it('should work if passed null', function (done) {
      model.index.exists(null, function (err) {
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
