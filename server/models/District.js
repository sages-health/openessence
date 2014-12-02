'use strict';

// TODO rename Location

var codex = require('../codex');
var conf = require('../conf');

module.exports = codex.model({
  index: 'location',
  type: 'location',
  refresh: true,
  client: conf.elasticsearch.client
}).with(require('../caper-trail').model);
