'use strict';

var codex = require('../codex');
var CsvMapping = require('../models/CsvMapping');

module.exports = codex.controller(CsvMapping, {
  get: true,
  search: true,
  insert: true,
  replace: true,
  delete: true
}).with(require('../caper-trail').controller);
