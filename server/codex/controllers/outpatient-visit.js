'use strict';

var util = require('util');
var Controller = require('../controller');
var errors = require('../errors');
var OutpatientVisit = require('../models/outpatient-visit');
var User = require('../models/user');

function OutpatientVisitController () {
  Controller.call(this);
}
util.inherits(OutpatientVisitController, Controller);

OutpatientVisitController.prototype.allowGet = function (esResponse, req, callback) {
  callback(null, User.hasRightsToRecord(req.user, esResponse));
};

OutpatientVisitController.prototype.prepareInsert = function (req, callback) {
  Controller.prototype.prepareInsert.call(this, req, function (err, esRequest) {
    if (err) {
      callback(err);
      return;
    }

    if (!User.hasRightsToRecord(req.user, esRequest)) {
      callback(new errors.AccessDeniedError());
    } else {
      callback(null, esRequest);
    }
  });
};

OutpatientVisitController.prototype.prepareDelete = function (req, callback) {
  Controller.prototype.prepareDelete.call(this, req, function (err, esRequest) {
    if (err) {
      callback(err);
      return;
    }

    new OutpatientVisit().get({id: esRequest.id}, function (err, visit) {
      if (err) {
        callback(err);
        return;
      }

      if (!User.hasRightsToRecord(req.user, visit)) {
        callback(new errors.AccessDeniedError());
      } else {
        callback(null, esRequest);
      }
    });
  });
};

OutpatientVisitController.prototype.prepareSearch = function (req, callback) {
  Controller.prototype.prepareSearch.call(this, req, function (err, esRequest) {
    if (err) {
      callback(err);
      return;
    }

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

    if (User.hasAllDistricts(req.user) || User.isAdmin(req.user)) {
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
  });
};

module.exports = OutpatientVisitController;
