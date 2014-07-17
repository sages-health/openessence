'use strict';

var codex = require('../codex');

module.exports = codex.model({
  index: 'visit_type',
  type: 'visit_type',
  refresh: true
}).with(require('../caper-trail').model);
