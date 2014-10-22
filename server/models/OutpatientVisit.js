'use strict';

var codex = require('../codex');
var conf = require('../conf');

module.exports = codex.model({
  index: 'outpatient_visit',
  type: 'outpatient_visit',
  refresh: true,
  client: conf.elasticsearch.client
}).with(require('../caper-trail').model);
