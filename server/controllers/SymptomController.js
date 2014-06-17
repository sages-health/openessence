'use strict';

var codex = require('../codex');
var Boom = require('boom');
var Symptom = require('../models/Symptom');

module.exports = codex.controller(Symptom, {
  get: true,
  search: true,
  insert: true,
  replace: true,
  preInsert: function (req, esRequest, callback) {
    if (!req.user || !req.user.isAdmin()) {
      return callback(Boom.forbidden());
    }

    // enforce unique constraint on name
    Symptom.search({
      body: {
        query: {
          'constant_score': {
            filter: {
              term: {
                // use un-analyzed version of the field for case-sensitive matching
                'name.raw': esRequest.body.name
              }
            }
          }
        }
      }
    }, function (err, results) {
      if (err) {
        return callback(err);
      }

      if (results.length > 0 && results[0]._.id !== esRequest.id) {
        return callback(Boom.create(400, 'There\'s already a symptom with the name ' + esRequest.body.name, {
          error: 'UniqueConstraintViolation',
          field: 'name',
          value: esRequest.body.name
        }));
      }

      callback(null, esRequest);
    });
  },

  delete: true,
  preDelete: function (req, esRequest, callback) {
    if (!req.user || !req.user.isAdmin()) {
      return callback(Boom.forbidden());
    }

    callback(null, esRequest);
  }
}).with(require('../caper-trail').controller);
