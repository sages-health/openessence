'use strict';

var _ = require('lodash');
var util = require('util');
var Model = require('../model');
var errors = require('../errors');
var scrypt = require('scrypt');

function User () {
  Model.call(this, {
    index: 'user',
    type: 'user'
  });
}

util.inherits(User, Model);

User.prototype.checkConstraints = function (params, callback) {
  var username = params.body.username;

  this.client.search({
    index: this.index.name,
    type: this.type,
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
  }, function (err, response) {
    if (err) {
      callback(err);
      return;
    }

    var results = response.hits.hits;

    if (results.length > 1) {
      callback(new Error('Existing records violate unique constraint'));
      return;
    }

    if (results.length === 1 && params.id !== results[0]._id) {
      callback(null, {
        name: 'UniqueConstraintViolationError',
        message: 'Unique constraint violation for name:"' + username + '"'
      });
    } else {
      callback(null);
    }
  });
};

User.prototype.insert = function (params, callback) {
  if (arguments.length < 2) {
    callback = arguments[0];
    params = null;
  }

  params = _.assign({
    index: this.index.name,
    type: this.type,
    refresh: true
  }, params);

  var user = this;
  this.checkConstraints(params, function (err, failure) {
    if (err) {
      callback(err);
      return;
    }

    if (failure) {
      callback(new errors.ConstraintError(failure.name, failure.message));
    } else {

      // if existing user
      if (params.id && !params.body.password) {
        // Editing user info or access list - retrieve old password and use it
        user.client.get({index: user.index.name, type: user.type, id: params.id}, function (err, esr) {
          if (err) {
            callback(err);
            return;
          }
          params.body.password = esr._source.password;
          user.client.index(params, callback);
        });
      } else {
        // if a new user or coming from change password screen, hash their password
        scrypt.params(0.1, function (err, scryptParameters) {
          if (err) {
            callback(err);
            return;
          }

          scrypt.hash(new Buffer(params.body.password, 'utf8'), scryptParameters, function (error, result) {
            if (error) {
              callback(error);
              return;
            }

            params.body.password = result.toString('hex');
            user.client.index(params, callback);
          });
        });
      }
    }
  });
};

// Run a query on the index
User.prototype.search = function (params, callback) {
  if (arguments.length < 2) {
    callback = arguments[0];
    params = null;
  }
  params = _.assign({
    index: this.index.name,
    type: this.type
  }, params);
  this.client.search(params, function (err, esr) {
    if (err) {
      callback(err);
      return;
    }
    esr.hits.hits.forEach(function (hit) {
      delete hit._source.password;
    });
    callback(err, esr);
  });
};

// TODO something like this belongs on an instance of User, but we don't have an ORM
User.hasRightsToRecord = function (user, record) {
  record = record._source || record.body || record;
  var facility = record.medicalFacility;
  if (!facility) {
    // no facility, so no access control necessary
    return true;
  }

  var district = facility.district;
  if (!district || !user.districts) {
    return true;
  }

  return User.hasAllDistricts(user) || user.districts.indexOf(district) !== -1;
};

User.isAdmin = function (user) {
  return user.roles && user.roles.indexOf('admin') !== -1;
};

User.hasAllDistricts = function (user) {
  return user.roles && user.roles.indexOf('district_all') !== -1;
};

User.prototype.findByUsername = function (username, callback) {
  this.client.search({
    index: this.index.name,
    type: this.type,
    body: {
      query: {
        'constant_score': {
          filter: {
            term: {
              'username.raw': username
            }
          }
        }
      }
    }
  }, function (err, response) {
    if (err) {
      callback(err);
      return;
    }

    var results = response.hits.hits;

    if (results.length > 1) {
      callback(new Error('Existing records violate unique constraint'));
    } else if (results.length === 0) {
      callback(null, null);
    } else {
      callback(null, results[0]);
    }
  });
};

/**
 * @param actualPassword the actual, hashed password
 * @param expectedPassword unhashed password to test
 * @param callback
 */
User.checkPassword = function (actualPassword, expectedPassword, callback) {
  scrypt.verify(actualPassword, expectedPassword, callback);
};

module.exports = User;
