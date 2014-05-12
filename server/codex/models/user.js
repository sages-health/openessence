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

  this.checkConstraints(params, function (err, failure) {
    if (err) {
      callback(err);
      return;
    }

    if (failure) {
      callback(new errors.ConstraintError(failure.name, failure.message));
    } else {

      var saveRecord = function (error, result) {
        if (error) {
          callback(error);
          return;
        }
        params.body.password = result.toString('hex');
        this.client.index(params, callback);
      }.bind(this);

      // if existing user
      if (params.id && !params.body.password) {
        // Editing user info or access list - retrieve old password and use it
        this.client.get({index: this.index.name, type: this.type, id: params.id}, function (err, esr) {
          if (err) {
            callback(err);
            return;
          }
          params.body.password = esr._source.password;
          this.client.index(params, callback);
        }.bind(this));
      }
      // if a new user or coming from change password screen, scrypt their password
      else {
        scrypt.params(0.1, function (err, scryptParameters) {
          scrypt.hash(new Buffer(params.body.password, 'utf8'), scryptParameters, saveRecord);
        });
      }
    }
  }.bind(this));
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

  return user.districts.indexOf('_all') !== -1 || user.districts.indexOf(district) !== -1;
};

User.isAdmin = function (user) {
  return user.roles && user.roles.indexOf('admin') !== -1;
};

User.hasAllDistricts = function (user) {
  // TODO decide on a standard for this, maybe replace districts with an all_districts role?
  return user.districts && user.districts.indexOf('_all') !== -1;
};

module.exports = User;
