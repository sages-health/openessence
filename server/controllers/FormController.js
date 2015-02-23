'use strict';

var codex = require('../codex');
var Boom = require('boom');
var Form = require('../models/Form');

module.exports = codex.controller(Form, {
  get: true,
  search: true,
  postSearch: function (req, esResponse, response, callback) {
    if (!req.user.isAdmin() && !req.user.hasAllLocations()) {
      var locations = req.user.doc.locations || [];
      var facilityFilter = function (facility) {
        return locations.indexOf(facility.name) > -1;
      };

      if (response && response.results) {
        for (var i = 0; i < response.results.length; i++) {
          var form = response.results[i]._source;
          if(form.name === 'site'){
            var fields = form.fields;
            for(var fldIx = 0; fldIx < fields.length; fldIx++){
              // Filter facilities based on user access
              if (fields[fldIx].name === 'medicalFacility') {
                fields[fldIx].values = fields[fldIx].values.filter(facilityFilter);
              }
            }
          }
        }
      }
    }
    callback(null, response);
  },
  insert: true,
  replace: true,
  preInsert: function (req, esRequest, callback) {
    if (!req.user || !req.user.isAdmin()) {
      return callback(Boom.forbidden());
    }

    callback(null, esRequest);
  },

  delete: true,
  preDelete: function (req, esRequest, callback) {
    if (!req.user || !req.user.isAdmin()) {
      return callback(Boom.forbidden());
    }

    callback(null, esRequest);
  }
}).with(require('../caper-trail').controller);
