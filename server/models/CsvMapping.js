'use strict';

var codex = require('../codex');
var conf = require('../conf');

module.exports = codex.model({
  index: 'csvmapping',
  type: 'csvmapping',
  refresh: true,
  client: conf.elasticsearch.client
}).with(require('../caper-trail').model);
