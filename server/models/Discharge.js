'use strict';

var codex = require('../codex');

module.exports = codex.model({
  index: 'discharge_type',
  type: 'discharge_type',
  refresh: true
}).with(require('../caper-trail').model);
