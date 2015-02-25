'use strict';

var chai = require('chai');
var expect = chai.expect;
var nock = require('nock');

var conf = require('../../../server/conf');
var User = require('../../../server/models/User');
var codex = require('../../../server/codex');

describe('User', function () {
  afterEach(function (done) {
    nock.cleanAll();
    User.writeLock.unlock(done);
  });

  describe('hasRightsToDocument()', function () {
    it('should return true if record has no medicalFacility', function (done) {
      var user = new User({locations: []});
      expect(user.hasRightsToDocument({})).to.be.true;
      done();
    });

    it('should return true if medicalFacility has no locations', function (done) {
      var user = new User({locations: []});
      expect(user.hasRightsToDocument({medicalFacility: {}})).to.be.true;
      done();
    });

    it('should return false if user has no locations', function (done) {
      var user = new User({locations: []});
      expect(user.hasRightsToDocument({medicalFacility: {district: 'D1'}})).to.be.false;
      done();
    });

    it('should return true if user has correct locations', function (done) {
      var user = new User({locations: ['D1']});
      expect(user.hasRightsToDocument({medicalFacility: {district: 'D1'}})).to.be.true;
      done();
    });
  });

  // TODO mock user write lock

  describe('insert()', function () {
    it('should enforce unique constraint on username', function (done) {
      nock(conf.elasticsearch.host)
        .post('/user/user/_search?version=true', {
          query: {
            'constant_score': {
              filter: {
                term: {
                  'username.raw': 'username'
                }
              }
            }
          }
        })
        .reply(200, {
          took: 5,
          'timed_out': false,
          hits: {
            total: 1,
            'max_score': null,
            hits: [
              {
                _index: 'user',
                _type: 'user',
                _id: '1',
                _version: 1,
                _score: 1,
                _source: {
                  username: 'username'
                }
              }
            ]
          }
        });

      new User({username: 'username', password: 'password'}).insert(function (err) {
        expect(err).to.exist;
        expect(err.data).to.deep.equal({
          error: 'UniqueConstraintViolation',
          field: 'username',
          value: 'username'
        });

        done();
      });
    });

    it('should lock to enforce unique constraint', function (done) {
      var searchRequest = {
        query: {
          'constant_score': {
            filter: {
              term: {
                'username.raw': 'username'
              }
            }
          }
        }
      };

      nock(conf.elasticsearch.host)
        .post('/user/user/_search?version=true', searchRequest)
        .times(2)
        .reply(200, {
          took: 5,
          'timed_out': false,
          hits: {
            total: 0,
            'max_score': null,
            hits: []
          }
        })
        .filteringRequestBody(function (body) {
          if (!body) {
            return body;
          }

          body = JSON.parse(body);
          if (body.slowUser) {
            return 'slowUser';
          }

          if (body.username === 'username' && body.password && Object.keys(body).length === 2) {
            return 'user';
          }

          return body;
        })
        .post('/user/user', 'slowUser')
        .reply(201, {
          _index: 'user',
          _type: 'user',
          _id: '1',
          _version: 1,
          created: true
        })
        .post('/user/user?refresh=true', 'user')
        .reply(201, {
          _index: 'user',
          _type: 'user',
          _id: '1',
          _version: 2,
          created: false
        });

      var SlowUser = codex.model(User);
      SlowUser.preInsert = SlowUser.preInsert.concat([function (user, callback) {
        setTimeout(function () {
          callback(null, user);
        }, 100);
      }]);
      var slowUser = new SlowUser({username: 'username', slowUser: true, password: 'password1'});

      var slowUserInserted;
      slowUser.insert(function (err) {
        if (err) {
          return done(err);
        }

        slowUserInserted = true;
      });

      var user2 = new User({username: 'username', password: 'password2'});
      user2.insert(function (err) {
        if (err) {
          return done(err);
        }

        // If we weren't locking, we'd expect the slow user to return after us
        expect(slowUserInserted).to.be.true;

        done();
      });

    });
  });
});
