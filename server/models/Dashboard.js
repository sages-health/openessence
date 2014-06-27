'use strict';

var codex = require('../codex');

module.exports = codex.model({
  index: 'dashboard',
  type: 'dashboard',
  refresh: true
}).with(require('../caper-trail').model);
