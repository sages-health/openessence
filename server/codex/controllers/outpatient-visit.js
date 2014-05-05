'use strict';

var util = require('util');
var Controller = require('../controller');

function OutpatientVisitController () {
  Controller.call(this);
}
util.inherits(OutpatientVisitController, Controller);

OutpatientVisitController.prototype.query = function (req, callback) {
  Controller.prototype.query.call(this, req, function (err, esResponse) {
    if (err) {
      callback(err);
      return;
    }

    if (esResponse.results.length === 0) {
      // nothing to filter
      callback(null, esResponse);
      return;
    }

    if (esResponse.results.length > 1) {
      callback(new Error('Multiple records with the same _id'));
      return;
    }

    var facility = esResponse.results[0]._source.medicalFacility;
    if (!facility) {
      // no facility, so no access control necessary
      callback(null, esResponse);
      return;
    }

    var district = facility.district;
    if (!district || !req.user.districts) {
      callback(null, esResponse);
      return;
    }

    if (req.user.districts.indexOf('_all') !== -1 || req.user.districts.indexOf(district) !== -1) {
      // user has access rights to this district
      callback(null, esResponse);
    } else {
      callback(null, {
        results: [],
        total: 0
      });
    }



    callback(null, esResponse);
  });
};

module.exports = OutpatientVisitController;
