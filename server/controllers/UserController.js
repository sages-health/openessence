'use strict';

var codex = require('../codex');
var Boom = require('boom');
var User = require('../models/User');

module.exports = codex.controller(User, {
  get: true,
  preGet: function (req, esRequest, callback) {
    if (!req.user) { // just in case
      return callback(Boom.forbidden());
    }

    if (req.user.isAdmin() || req.user.id === esRequest.id) {
      // admins can see anyone, regular users can only see themselves
      return callback(null, esRequest);
    } else {
      return callback(Boom.forbidden());
    }
  },

  search: true,
  preSearch: function (req, esRequest, callback) {
    if (!req.user || !req.user.isAdmin()) {
      return callback(Boom.forbidden());
    }

    callback(null, esRequest);
  },
  postSearch: function (req, esResponse, callback) {
    if (esResponse && esResponse.results) {
      for (var i = 0; i < esResponse.results.length; i++) {
        delete esResponse.results[i]._source.password;
      }
    }
    callback(null, esResponse);
  },

  insert: true,
  replace: true,
  preInsert: function (req, esRequest, callback) {
    var user = req.user;

    // TODO figure out what access control to enforce
    // maybe anyone can create users in demo mode, but only admins can create users in non demo mode
    // or maybe anyone can create users any time but they're quarantined until an admin approves them?
    if (!user || !user.canCreateUser(esRequest.body)) {
      return callback(Boom.forbidden());
    }

    if (esRequest.id) {
      if (esRequest.id !== user.id && !user.isAdmin()) {
        // can't modify other users
        return callback(Boom.forbidden());
      }

      if (!esRequest.body.password) {
        // we don't send passwords to the client, so we need to get them when editing an existing user
        User.get({id: esRequest.id}, function (err, esr) {
          if (err) {
            return callback(err);
          }
          // set password
          esRequest.body.password = esr.doc.password;
          callback(null, esRequest);
        });
      } else {
        // existing user editing their password, so the password is already hashed
        // Note that scrypt is smart enough not to double encode digests (I guess it checks for the "scrypt" preamble
        // and associated params), so it's OK that the model still tries to hash it.
        return callback(null, esRequest);
      }
    } else {
      // creating new user
      if (!esRequest.body.password) {
        return callback(Boom.badRequest('Can\'t create user with no password'));
      }
      // nothing to do since password will be hashed by model
      return callback(null, esRequest);
    }
  },

  delete: true,
  preDelete: function (req, esRequest, callback) {
    if (!req.user) {
      return callback(Boom.forbidden());
    } else if (req.user.id === esRequest.id) {
      // TODO provide a way for users to delete their accounts
      return callback(Boom.forbidden('Sorry, but you cannot delete your own account'));
    }

    callback(null, esRequest);
  }
}).with(require('../caper-trail').controller);
