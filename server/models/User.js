'use strict';

var _ = require('lodash');
var scrypt = require('scrypt');
var codex = require('../codex');

var User = codex.model({
  index: 'user',
  type: 'user',

  classMethods: {
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

      scrypt.params(0.1, function (err, scryptParameters) {
        if (err) {
          if (!(err instanceof Error)) { // scrypt tends to return raw objects instead of Errors
            return callback(_.assign(new Error('scrypt.params error'), err));
          }
          return callback(err);
        }

        scrypt.hash(password, scryptParameters, callback);
      });
    }
  },

  instanceMethods: {
    isAdmin: function () {
      return this.roles && this.roles.indexOf('admin') !== -1;
    },
    hasAllDistricts: function () {
      return this.roles && this.roles.indexOf('district_all') !== -1;
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
      if (!district || !this.districts) {
        return true;
      }

      return this.hasAllDistricts() || this.districts.indexOf(district) !== -1;
    },

    canCreateUser: function (doc) {
      if (this.isAdmin()) {
        return true;
      }

      var myRoles = this.roles || [];
      if (doc.roles) {
        if (!doc.roles.every(function (r) { return myRoles.indexOf(r) !== -1; })) {
          // can't give user a role you don't have
          return false;
        }
      }

      // TODO check districts, or are districts just roles?
    },

    checkPassword: function (password, callback) {
      var myPassword = this.password;
      if (!Buffer.isBuffer(myPassword)) {
        myPassword = new Buffer(myPassword, 'hex');
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

  preInsert: function (doc, callback) {
    if (doc.password) {
      User.hashPassword(doc.password, function (err, password) {
        if (err) {
          return callback(err);
        }

        return callback(null, _.assign({}, doc, {password: password}));
      });
    } else {
      callback(null, new Error('Cannot create user without password'));
    }
  }
});

module.exports = User;
