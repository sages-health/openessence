'use strict';

var codex = require('../codex');
var conf = require('../conf');

module.exports = codex.model({
  index: 'visit_type',
  type: 'visit_type',
  refresh: true,
  client: conf.elasticsearch.client
}).with(require('../caper-trail').model);
