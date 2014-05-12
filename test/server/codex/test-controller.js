'use strict';

var chai = require('chai');
chai.use(require('sinon-chai'));
var expect = chai.expect;
var nock = require('nock');
var request = require('supertest');
var express = require('express');

var codex = require('../../../server/codex');
var conf = require('../../../server/conf');
var Model = require('../../../server/codex/model');
var Controller = require('../../../server/codex/controller');

describe('Controller', function () {
  afterEach(function () {
    nock.cleanAll();
  });

  describe('GET /:model', function () {
    /*jshint quotmark:false */
    it("should return 404 if index doesn't exist", function (done) {
      nock(conf.elasticsearch.host)
        .post('/foo/bar/_search', {
          query: {
            'match_all': {}
          }
        })
        .reply(404, {
          error: 'IndexMissingException[[foo] missing]',
          status: 404
        });

      var app = express();
      app.use(function (req, res, next) {
        req.model = new Model({
          index: 'foo',
          type: 'bar'
        });
        req.controller = new Controller();
        next();
      });
      app.use(codex());

      request(app)
        .get('/doesNotMatterBecauseModelIsAlreadyOnReq')
        .expect(404)
        .end(function (err) {
          if (err) {
            done(err);
            return;
          }

          done();
        });
    });
  });
});
