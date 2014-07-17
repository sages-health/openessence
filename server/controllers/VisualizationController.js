'use strict';

var codex = require('../codex');
var Visualization = require('../models/Visualization');

module.exports = codex.controller(Visualization, {
  get: true,
  search: true,
  insert: true,
  replace: true,
  delete: true
}).with(require('../caper-trail').controller);
