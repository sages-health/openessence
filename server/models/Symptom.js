'use strict';

var codex = require('../codex');

module.exports = codex.model({
  index: 'symptom',
  type: 'symptom',
  refresh: true
}).with(require('../caper-trail').model);
