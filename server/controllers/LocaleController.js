'use strict';

var codex = require('../codex');
var Locale = require('../models/Locale');

module.exports = codex.controller(Locale, {
  get: true,
  search: true,
  insert: true,
  replace: true,
  delete: true
}).with(require('../caper-trail').controller);
