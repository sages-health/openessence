'use strict';

var codex = require('../codex');
var Boom = require('boom');
var Facility = require('../models/Facility');

module.exports = codex.controller(Facility, {
  get: true,
  search: true,
  insert: true,
  preInsert: function (req, esRequest, callback) {
    if (!req.user || !req.user.isAdmin()) {
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
