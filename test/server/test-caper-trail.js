'use strict';

var chai = require('chai');
chai.use(require('sinon-chai'));
var expect = chai.expect;
var nock = require('nock');
var request = require('supertest');
var express = require('express');

var _ = require('lodash');
var caperTrail = require('../../server/caper-trail');
var codex = require('../../server/codex');
var conf = require('../../server/conf');
var User = require('../../server/models/User');

describe('caper trail', function () {
  afterEach(function () {
    nock.cleanAll();
  });

  describe('model', function () {
    it('should create paper trail', function (done) {
      var es = nock(conf.elasticsearch.host)
        .filteringRequestBody(function (body) {
          var trail = JSON.parse(body).paperTrail;
          if (!trail || !Array.isArray(trail) || trail.length !== 1) {
            return false;
          }

          var date = trail[0].createdAt;
          if (!date || !_.isString(date)) {
            return false;
          }

          date = new Date(date);
          if (isNaN(date.getTime())) {
            // invalid date
            return false;
          }

          return 'paperTrail';
        })
        .post('/foo/bar', 'paperTrail')
        .reply(200, {
          _index: 'foo',
          _type: 'bar',
          _id: 'r@nd0m!d',
          _version: 1,
          created: true
        });

      var Bar = codex.model({
        index: 'foo',
        type: 'bar'
      }).with(caperTrail.model);

      new Bar({}).insert(function (err) {
        if (err) {
          return done(err);
        }

        expect(es.isDone()).to.be.true;

        done();
      });
    });

    it('should add to paper trail if one already exists', function (done) {
      var es = nock(conf.elasticsearch.host)
        .get('/foo/bar/1')
        .reply(200, {
          _index: 'foo',
          _type: 'bar',
          _id: '1',
          _version: 1,
          _source: {
            paperTrail: [
              {
                createdAt: new Date('2000-01-01'),
                kept: true // canary to make sure we didn't overwrite this record
              }
            ]
          }
        })
        .filteringRequestBody(function (body) {
          if (!body) {
            return false;
          }
          var trail = JSON.parse(body).paperTrail;
          if (!trail || !Array.isArray(trail) || trail.length !== 2 || !trail[0].kept) {
            return false;
          }

          return 'paperTrail';
        })
        .post('/foo/bar/1', 'paperTrail')
        .reply(200, {
          _index: 'foo',
          _type: 'bar',
          _id: '1',
          _version: 2
        });

      var Bar = codex.model({
        index: 'foo',
        type: 'bar'
      }).with(caperTrail.model);

      new Bar({}, {id: '1'}).insert(function (err) {
        if (err) {
          return done(err);
        }

        expect(es.isDone()).to.be.true;

        done();
      });
    });
  });

  describe('controller', function () {
    it('should add user to paper trail', function (done) {
      var Bar = codex.model({
        index: 'foo',
        type: 'bar'
      });
      var controller = codex.controller(Bar, {insert: true}).with(caperTrail.controller);

      var esResponse = {
        _index: 'foo',
        _type: 'bar',
        _id: '1',
        _version: 1,
        created: true
      };
      nock(conf.elasticsearch.host)
        .filteringRequestBody(function (body) {
          if (!body) {
            return false;
          }

          body = JSON.parse(body);
          if (!body || !body.a || body.a !== 1) {
            return false;
          }

          var trail = body.paperTrail;
          if (!trail || !Array.isArray(trail) || trail.length !== 1) {
            return false;
          }

          var date = trail[0].createdAt;
          if (!date || !_.isString(date)) {
            return false;
          }

          date = new Date(date);
          if (isNaN(date.getTime())) {
            // invalid date
            return false;
          }

          var user = trail[0].user;
          if (!user || user.username !== 'admin') {
            return false;
          }

          return 'paperTrail';
        })
        .post('/foo/bar', 'paperTrail')
        .reply(201, esResponse);

      var app = express();
      app.use(function (req, res, next) {
        req.user = new User({username: 'admin'});
        next();
      });
      app.use(codex.middleware(controller));

      request(app)
        .post('/')
        .send({a: 1})
        .expect(201)
        .end(function (err) {
          if (err) {
            return done(err);
          }

          done();
        });
    });

    it('should ignore client-specified paper trail', function (done) {
      var Bar = codex.model({
        index: 'foo',
        type: 'bar'
      });
      var controller = codex.controller(Bar, {insert: true}).with(caperTrail.controller);

      var esResponse = {
        _index: 'foo',
        _type: 'bar',
        _id: '1',
        _version: 1,
        created: true
      };
      nock(conf.elasticsearch.host)
        .filteringRequestBody(function (body) {
          if (!body) {
            return false;
          }

          body = JSON.parse(body);
          if (!body) {
            return false;
          }

          var trail = body.paperTrail;
          if (!trail || !Array.isArray(trail) || trail.length !== 1 || trail[0].canary) {
            return false;
          }

          return 'paperTrail';
        })
        .post('/foo/bar', 'paperTrail')
        .reply(201, esResponse);

      var app = express();
      app.use(function (req, res, next) {
        req.user = new User({username: 'admin'});
        next();
      });
      app.use(codex.middleware(controller));

      request(app)
        .post('/')
        .send({paperTrail: [{createdAt: new Date(), canary: true}]})
        .expect(201)
        .end(function (err) {
          if (err) {
            return done(err);
          }

          done();
        });
    });

    it('should preserve existing paper trail', function (done) {
      // TODO
      done();
    });
  });
});
