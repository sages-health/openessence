'use strict';

var codex = require('../codex');
var Boom = require('boom');
var Facility = require('../models/Facility');

module.exports = codex.controller(Facility, {
  get: true,
  search: true,
  preSearch: function (req, esRequest, callback) {
    if (!req.user) {
      return callback(Boom.forbidden());
    }

    var filter = {
      terms: {
        'name': req.user.doc.locations ? req.user.doc.locations : []
      }
    };

    if (req.user.hasAllLocations() || req.user.isAdmin()) {
      filter = {};
    }

    // Wrap query in a filtered query. We don't use a top level filter because that only filters the result, and does
    // not affect aggregations or facets.
    // See http://elasticsearch-users.115913.n3.nabble.com/Filtered-query-vs-using-filter-outside-td3960119.html
    var query = esRequest.body.query;
    esRequest.body.query = {
      filtered: {
        filter: filter,
        query: query
      }
    };

    callback(null, esRequest);
  },
  insert: true,
  preInsert: function (req, esRequest, callback) {

    if (!req.user || !(req.user.isAdmin() || req.user.isAPIUser())) {
      return callback(Boom.forbidden());
    }

    if (req.user && req.user.isAPIUser() && req.method === 'PUT') {
      return callback(Boom.forbidden());
    }

    callback(null, esRequest);
  },
  replace: true,
  delete: true,
  preDelete: function (req, esRequest, callback) {
    if (!req.user || !req.user.isAdmin()) {
      return callback(Boom.forbidden());
    }

    callback(null, esRequest);
  }
}).with(require('../caper-trail').controller);
