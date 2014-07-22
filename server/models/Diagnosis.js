'use strict';

var codex = require('../codex');
var conf = require('../conf');

module.exports = codex.model({
  index: 'diagnosis',
  type: 'diagnosis',
  refresh: true,
  client: conf.elasticsearch.client
}).with(require('../caper-trail').model);
