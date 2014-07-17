'use strict';

var codex = require('../codex');

module.exports = codex.model({
  index: 'region',
  type: 'district',
  refresh: true
}).with(require('../caper-trail').model);
