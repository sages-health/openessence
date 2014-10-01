'use strict';

var chai = require('chai');
chai.use(require('sinon-chai'));
var expect = chai.expect;
var nock = require('nock');
var request = require('supertest');
var express = require('express');
var bodyParser = require('body-parser');

var codex = require('../../../server/codex');
var conf = require('../../../server/conf');

describe('Controller', function () {
  afterEach(function () {
    nock.cleanAll();
  });

  var app = function (middleware) {
    return express()
      .use(bodyParser.json())
      .use(middleware)
      .use(function (err, req, res, next) {
        console.error(err);
        next();
      });
  };

  describe('search', function () {
    it('should delegate to preSearch', function (done) {
      var response = {
        took: 100,
        'timed_out': false,
        hits: {
          total: 0,
          hits: []
        }
      };
      nock(conf.elasticsearch.host)
        .post('/foo/bar/_search?version=true', {
          query: {
            fakeQuery: {}
          }
        })
        .reply(200, response);

      var Model = codex.model({
        index: 'foo',
        type: 'bar'
      });
      var controller = codex.controller(Model, {
        search: true,
        preSearch: function (req, esRequest, callback) {
          expect(esRequest).to.deep.equal({
            body: {
              query: {
                'match_all': {}
              }
            }
          });

          callback(null, {
            body: {
              query: {
                fakeQuery: {}
              }
            }
          });
        }
      });

      request(app(controller.search))
        .get('/')
        .expect(200)
        .end(function (err) {
          if (err) {
            return done(err);
          }

          done();
        });
    });

    it('should allow postSearch callbacks to modify response', function (done) {
      var esResponse = {
        took: 100,
        'timed_out': false,
        hits: {
          total: 0,
          hits: []
        }
      };
      nock(conf.elasticsearch.host)
        .post('/foo/bar/_search?version=true', {
          query: {'match_all': {}}
        })
        .reply(200, esResponse);

      var Model = codex.model({
        index: 'foo',
        type: 'bar'
      });
      var controller = codex.controller(Model, {
        search: true,
        postSearch: function (req, esr, response, callback) {
          expect(esr).to.deep.equal(esResponse);
          expect(response).to.deep.equal({results: [], total: 0});
          callback(null, {foo: 'bar'});
        }
      });

      request(app(controller.search))
        .get('/')
        .expect(200)
        .end(function (err, resp) {
          if (err) {
            return done(err);
          }

          expect(resp.body).to.deep.equal({foo: 'bar'});

          done();
        });
    });
  });

  describe('get', function () {
    it('should allow postGet callbacks to modify response', function (done) {
      var esResponse = {
        _index: 'foo',
        _type: 'bar',
        _version: 1,
        _id: '1',
        _source: {}
      };
      nock(conf.elasticsearch.host)
        .get('/foo/bar/1')
        .reply(200, esResponse);

      var Model = codex.model({
        index: 'foo',
        type: 'bar'
      });
      var controller = codex.controller(Model, {
        'get': true,
        postGet: function (req, esr, response, callback) {
          expect(esr).to.deep.equal(esResponse);
          expect(response).to.deep.equal({
            _id: esResponse._id,
            _version: esResponse._version,
            _source: esResponse._source
          });
          callback(null, {foo: 'bar'});
        }
      });

      request(codex.middleware(controller))
        .get('/1')
        .expect(200)
        .end(function (err, resp) {
          if (err) {
            return done(err);
          }

          expect(resp.body).to.deep.equal({foo: 'bar'});

          done();
        });

    });
  });

  // TODO need tests for each lifecyle callback
});
