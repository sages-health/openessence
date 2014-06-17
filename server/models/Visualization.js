'use strict';

var codex = require('../codex');

module.exports = codex.model({
  index: 'visualization',
  type: 'visualization',
  refresh: true
}).with(require('../caper-trail').model);
