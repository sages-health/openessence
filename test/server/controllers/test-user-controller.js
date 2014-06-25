'use strict';

var chai = require('chai');
chai.use(require('sinon-chai'));
var expect = chai.expect;
var nock = require('nock');
var request = require('supertest');
var express = require('express');

var codex = require('../../../server/codex');
var conf = require('../../../server/conf');
var errorMiddleware = require('../../../server/error').middleware;
var User = require('../../../server/models/User');
var UserController = require('../../../server/controllers/UserController');

describe('UserController', function () {
  afterEach(function () {
    nock.cleanAll();
  });

  var addUser = function (user) {
    return function (req, res, next) {
      req.user = user;
      next();
    };
  };

  describe('POST /, AKA creating a new user,', function () {
    it('should return 403 if not signed in', function (done) {
      var app = express();
      app.use(codex.middleware(UserController))
        .use(errorMiddleware);

      request(app)
        .post('/')
        .expect(403)
        .end(function (err) {
          if (err) {
            return done(err);
          }

          done();
        });
    });

    it('should return 403 if user is not an admin', function (done) {
      var app = express()
        .use(addUser(new User({roles: []})))
        .use(codex.middleware(UserController))
        .use(errorMiddleware);

      request(app)
        .post('/')
        .expect(403)
        .end(function (err) {
          if (err) {
            return done(err);
          }

          done();
        });
    });

    it('should work if user is an admin', function (done) {
      var actualPassword;

      nock(conf.elasticsearch.host)
        .filteringRequestBody(function (body) {
          if (!body) {
            return false;
          }

          body = JSON.parse(body);
          if (Object.keys(body).length !== 3 || body.username !== 'foo' || body.password === 'password') {
            return false;
          }

          actualPassword = body.password;

          return 'username/password';
        })
        .post('/user/user?refresh=true', 'username/password')
        .reply(201, {created: true});

      var app = express()
        .use(addUser(new User({roles: ['admin']})))
        .use(codex.middleware(UserController))
        .use(errorMiddleware);

      request(app)
        .post('/')
        .send({username: 'foo', password: 'password'})
        .expect(201)
        .end(function (err) {
          if (err) {
            return done(err);
          }

          actualPassword = new Buffer(actualPassword, 'hex');

          // make sure it's hashed
          expect(actualPassword.toString('utf8').indexOf('scrypt')).to.equal(0);

          done();
        });
    });
  });

  describe('PUT /:id, AKA changing user attributes, including password,', function () {
    // TODO test this
  });
});
