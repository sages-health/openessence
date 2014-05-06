'use strict';

var util = require('util');
var Controller = require('../controller');

function OutpatientVisitController () {
  Controller.call(this);
}
util.inherits(OutpatientVisitController, Controller);

OutpatientVisitController.prototype.query = function (req, res, next) {
  req.model.get({id: req.instance}, function (err, esResponse) {
    if (err) {
      next(err);
      return;
    }

    var send = function (esr) {
      var record = {
        _index: esr._index,
        _type: esr._type,
        _id: esr._id
      };

      if (esr.found) {
        res.status(200);
        record._version = esr._version;
        record._source = esr._source;
      } else {
        res.status(404);
        // don't add anything else to record
      }

      res.send(record);
    };

    if (!esResponse.found) {
      // nothing to filter
      send(esResponse);
      return;
    }

    var facility = esResponse._source.medicalFacility;
    if (!facility) {
      // no facility, so no access control necessary
      send(esResponse);
      return;
    }

    var district = facility.district;
    if (!district || !req.user.districts) {
      send(esResponse);
      return;
    }

    if (req.user.districts.indexOf('_all') !== -1 || req.user.districts.indexOf(district) !== -1) {
      // user has access rights to this district
      send(esResponse);
    } else {
      esResponse.found = false;
      send(esResponse);
    }
  });
};

module.exports = OutpatientVisitController;
