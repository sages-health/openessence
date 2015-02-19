'use strict';

var _ = require('lodash');
var async = require('async');

var scrypt = require('scrypt');
var Boom = require('boom');

var codex = require('../codex');
var conf = require('../conf');
var logger = conf.logger;
var Lock = require('yarnl');

var scryptParams = scrypt.params(0.1);

var User = codex.model({
  index: 'user',
  type: 'user',
  refresh: true,
  client: conf.elasticsearch.client,

  classMethods: {

    findByToken: function (token, esRequest, callback) {
      if (!callback) {
        callback = arguments[1];
        esRequest = null;
      }

      esRequest = _.assign({
        body: {
          query: {
            'constant_score': {
              filter: {
                term: {
                  tokens: token // tokens saved as not-analyzed
                }
              }
            }
          }
        }
      }, esRequest);

      return User.search(esRequest, function (err, users) {
        if (err) {
          return callback(err);
        }

        if (users.length > 1) {
          return callback(new Error('Multiple users for token ' + token));
        } else if (users.length === 0) {
          return callback(null, null);
        } else {
          return callback(null, users[0]);
        }
      });
    },

    findByUsername: function (username, esRequest, callback) {
      if (!callback) {
        callback = arguments[1];
        esRequest = null;
      }

      esRequest = _.assign({
        body: {
          query: {
            'constant_score': {
              filter: {
                term: {
                  // use un-analyzed version of the field for case-sensitive matching
                  'username.raw': username
                }
              }
            }
          }
        }
      }, esRequest);

      return User.search(esRequest, function (err, users) {
        if (err) {
          return callback(err);
        }

        if (users.length > 1) {
          return callback(new Error('Multiple users for username ' + username));
        } else if (users.length === 0) {
          return callback(null, null);
        } else {
          return callback(null, users[0]);
        }
      });
    },

    hashPassword: function (password, callback) {
      if (!Buffer.isBuffer(password)) {
        password = new Buffer(password, 'utf8');
      }

      scrypt.hash(password, scryptParams, callback);
    }
  },

  instanceMethods: {
    isAdmin: function () {
      return this.doc.roles && this.doc.roles.indexOf('admin') !== -1;
    },
    isAPIUser: function () { // Using Bearer Authenticated API
      return this.doc.roles && this.doc.roles.indexOf('api_user') !== -1;
    },
    isDataEnterer: function () {
      return this.doc.roles && this.doc.roles.indexOf('data_entry') !== -1;
    },
    hasAllDistricts: function () {
      return this.doc.roles && this.doc.roles.indexOf('district_all') !== -1;
    },
    hasRightsToDocument: function (doc) {
      if (!doc) {
        return true;
      }

      var facility = doc.medicalFacility;
      if (!facility) {
        // no facility, so no access control necessary
        return true;
      }

      var district = facility.district;
      if (!district || !this.doc.districts) {
        return true;
      }

      return this.hasAllDistricts() || this.doc.districts.indexOf(district) !== -1;
    },

    canCreateUser: function (doc) {
      if (this.isAdmin()) {
        return true;
      }

      var myRoles = this.doc.roles || [];
      if (doc.roles) {
        if (!doc.roles.every(function (r) {
            return myRoles.indexOf(r) !== -1;
          })) {
          // can't give user a role you don't have
          return false;
        }
      }

      // TODO check districts, or are districts just roles?
    },

    verifyPassword: function (password, callback) {
      var myPassword = this.doc.password;
      if (!Buffer.isBuffer(myPassword)) {
        myPassword = new Buffer(myPassword, 'hex'); // TODO switch to base64
      }

      scrypt.verify(myPassword, password, function (err, result) {
        /*jshint camelcase:false */
        if (err) {
          if (err instanceof Error) {
            // scrypt tends to return raw objects instead of errors, but check just in case the fix that one day
            return callback(err);
          }

          if (err.scrypt_err_code === 11) {
            // convert scrypt's "password is incorrect" error into a false return value
            return callback(null, false);
          }

          return callback(new Error(err.scrypt_err_message));
        }

        callback(null, result);
      });
    }
  },

  preInsert: function (user, callback) {
    async.parallel({
      hash: function _hash(callback) {
        if (!user.doc.password) { // Persona users don't have passwords
          return callback(null, user.doc.password);
        }

        User.hashPassword(user.doc.password, function (err, password) {
          if (err) {
            return callback(err);
          }

          return callback(null, password.toString('hex'));
        });
      },

      unlock: function _lock(callback) {
        // Lock while we check the unique constraint. Otherwise, another client could insert after we check the
        // constraint but before we insert. This is equivalent to the table-wide write locks that most relational
        // DBs use to enforce constraints.
        user.writeLock.lock(function (err, unlock) {
          if (err) {
            return callback(err);
          } else if (!unlock) {
            return callback(new Error('Failed to acquire user write lock'));
          }

          User.search({
            body: {
              query: {
                'constant_score': {
                  filter: {
                    term: {
                      // use un-analyzed version of the field for case-sensitive matching
                      'username.raw': user.doc.username
                    }
                  }
                }
              }
            }
          }, function (err, users) {
            if (err) {
              return callback(err);
            }

            if (users.length && users[0].id !== user.id) { // we don't check if users.length > 1
              return callback(Boom.create(400, 'There\'s already a user with the username ' + user.doc.username, {
                error: 'UniqueConstraintViolation',
                field: 'username',
                value: user.doc.username
              }));
            }

            callback(null, unlock);
          });
        });
      }
    }, function (err, results) {
      var releaseLock = function () {
        user.writeLock.unlock(function (err) {
          if (err) {
            // not a big deal, since locks auto-expire, but best to log it anyway
            logger.error({err: err}, 'Error releasing user write lock');
          }
        });
      };

      if (err) {
        releaseLock();
        return callback(err);
      }

      user.once('insert', function () {
        // Our lock guarantees that this event is from this index request, and not a different one
        releaseLock();
      });

      user.doc.password = results.hash;

      callback(null, user);
    });
  }
});

User.prototype.writeLock = User.writeLock = new Lock('user:write', {
  client: conf.redis.client,
  maxAttempts: 100 // a high enough number that writes shouldn't fail, but low enough that we give up after a while
});

module.exports = User;
