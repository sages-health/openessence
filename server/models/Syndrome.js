'use strict';

var codex = require('../codex');

module.exports = codex.model({
  index: 'syndrome',
  type: 'syndrome',
  refresh: true
}).with(require('../caper-trail').model);
