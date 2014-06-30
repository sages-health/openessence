'use strict';

var codex = require('../codex');
var Dashboard = require('../models/Dashboard');

module.exports = codex.controller(Dashboard, {
  get: true,
  search: true,
  insert: true,
  replace: true,
  delete: true
}).with(require('../caper-trail').controller);
