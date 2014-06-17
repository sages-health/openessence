'use strict';

var codex = require('../codex');

module.exports = codex.model({
  index: 'diagnosis',
  type: 'diagnosis',
  refresh: true
}).with(require('../caper-trail').model);
