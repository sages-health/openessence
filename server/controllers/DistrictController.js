'use strict';

var codex = require('../codex');
var Boom = require('boom');
var District = require('../models/District');

module.exports = codex.controller(District, {
  get: true,
  search: true,
  insert: true,
  replace: true,
  preInsert: function (req, esRequest, callback) {
    if (!req.user || !req.user.isAdmin()) {
      return callback(Boom.forbidden());
    }

    // enforce unique constraint on name
    District.search({
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

      if (results.length > 0) {
        return callback(Boom.create(400, 'There\'s already a district with the name ' + esRequest.body.name, {
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
