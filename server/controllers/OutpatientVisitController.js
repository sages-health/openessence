'use strict';

var codex = require('../codex');
var Boom = require('boom');
var OutpatientVisit = require('../models/OutpatientVisit');

module.exports = codex.controller(OutpatientVisit, {
  get: true,
  postGet: function (req, esResponse, callback) {
    if (req.user.hasRightsToDocument(esResponse._source)) {
      return callback(null, esResponse);
    } else {
      return callback(Boom.forbidden());
    }
  },

  search: true,
  preSearch: function (req, esRequest, callback) {
    var filter = {
      terms: {
        'medicalFacility.district.raw': {
          index: 'user',
          type: 'user',
          id: req.user.id,
          path: 'districts.raw',
          // don't cache the terms lookup since it doesn't get updated on writes,
          // see https://github.com/elasticsearch/elasticsearch/issues/3219
          cache: false
        },

        // There's no need to manually clear the cache on writes (Lucene's immutable segments are good for something).
        // See https://groups.google.com/forum/#!topic/elasticsearch/WgtgrG3mKCg.
        // That being said, setting _cache_key is good practice in case you ever do need to clear it.
        '_cache_key': 'outpatient_visit_user_user_' + req.user.id
      }
    };

    if (req.user.hasAllDistricts() || req.user.isAdmin()) {
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
  replace: true,
  preInsert: function (req, esRequest, callback) {
    // don't let users log data for a region they don't have access to
    if (!req.user.hasRightsToDocument(esRequest.body)) {
      return callback(Boom.forbidden());
    }

    if (!esRequest.id && esRequest.id !== 0) {
      // new document, good to go
      return callback(null, esRequest);
    }

    // need to check existing document's permissions
    OutpatientVisit.get(esRequest.id, function (err, visit) {
      if (err) {
        return callback(err);
      }

      if (req.user.hasRightsToDocument(visit)) {
        return callback(null, esRequest);
      } else {
        return callback(Boom.forbidden());
      }
    });
  },

  delete: true,
  preDelete: function (req, esRequest, callback) {
    OutpatientVisit.get({id: esRequest.id}, function (err, visit) {
      if (err) {
        return callback(err);
      }

      if (req.user.hasRightsToDocument(visit)) {
        return callback(null, esRequest);
      } else {
        return callback(Boom.forbidden());
      }
    });
  }
}).with(require('../caper-trail').controller);
