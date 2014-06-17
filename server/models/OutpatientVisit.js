'use strict';

var codex = require('../codex');

module.exports = codex.model({
  index: 'outpatient',
  type: 'visit',
  refresh: true
}).with(require('../caper-trail').model);
