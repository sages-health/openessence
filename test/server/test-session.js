'use strict';

var chai = require('chai');
chai.use(require('sinon-chai'));
var expect = chai.expect;
var nock = require('nock');
var request = require('supertest');

var express = require('express');
var passport = require('passport');

var conf = require('../../server/conf');
var session = require('../../server/session');

describe('session', function () {
  afterEach(function () {
    nock.cleanAll();
  });

  it('should return 401 if anonymous user tries to delete session', function (done) {
    request(session)
      .delete('/')
      .expect(401)
      .expect('WWW-Authenticate', 'None')
      .end(function (err) {
        if (err) {
          return done(err);
        }

        done();
      });
  });

  describe('local', function () {
    it('should return 200 on success', function (done) {
      nock(conf.elasticsearch.host)
        .post('/user/user/_search', {
          query: {
            'constant_score': {
              filter: {
                term: {
                  // use un-analyzed version of the field for case-sensitive matching
                  'username.raw': 'admin'
                }
              }
            }
          }
        })
        .reply(200, {
          took: 100,
          'timed_out': false,
          hits: {
            total: 1,
            'max_score': 1,
            hits: [
              {
                _index: 'user',
                _type: 'user',
                _id: '1',
                _score: 1,
                _source: {
                  username: 'admin',
                  password: new Buffer('c2NyeXB0AAoAAAAIAAAAFuATEagqDpM/f/hC+pbzTtcyMM7iPtS+56BKc8v5yMVdblqKpzM/u0j7PKc9MYHHAbiLCM/jL9A3z0m7SKwv/RFutRwCvkO8C4KNbHiXs7Ia', 'base64').toString('hex')
                }
              }
            ]
          }
        });

      var app = express();
      app.use(passport.initialize());
      app.use(session);

      request(app)
        .post('/local')
        .send({
          username: 'admin',
          password: 'admin'
        })
        .expect(200)
        .end(function (err) {
          if (err) {
            return done(err);
          }

          done();
        });
    });

    it('should return 403 on bad password', function (done) {
      nock(conf.elasticsearch.host)
        .post('/user/user/_search', {
          query: {
            'constant_score': {
              filter: {
                term: {
                  // use un-analyzed version of the field for case-sensitive matching
                  'username.raw': 'admin'
                }
              }
            }
          }
        })
        .reply(200, {
          took: 100,
          'timed_out': false,
          hits: {
            total: 1,
            'max_score': 1,
            hits: [
              {
                _index: 'user',
                _type: 'user',
                _id: '1',
                _score: 1,
                _source: {
                  username: 'admin',
                  password: new Buffer('c2NyeXB0AAoAAAAIAAAAFuATEagqDpM/f/hC+pbzTtcyMM7iPtS+56BKc8v5yMVdblqKpzM/u0j7PKc9MYHHAbiLCM/jL9A3z0m7SKwv/RFutRwCvkO8C4KNbHiXs7Ia', 'base64').toString('hex')
                }
              }
            ]
          }
        });

      var app = express();
      app.use(passport.initialize());
      app.use(session);

      request(app)
        .post('/local')
        .send({
          username: 'admin',
          password: 'wrongpassword'
        })
        .expect(403)
        .end(function (err, res) {
          if (err) {
            return done(err);
          }

          expect(res.body).to.deep.equal({error: 'BadCredentials'});

          done();
        });
    });
  });
});
