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
  });

  // TODO need tests for each lifecyle callback
});
