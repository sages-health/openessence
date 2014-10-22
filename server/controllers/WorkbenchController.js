'use strict';

var codex = require('../codex');
var Workbench = require('../models/Workbench');

module.exports = codex.controller(Workbench, {
  get: true,
  search: true,
  insert: true,
  replace: true,
  delete: true
}).with(require('../caper-trail').controller);
