'use strict';

var _ = require('lodash');
var defaults = require('./defaults');

module.exports = _.assign(defaults, {
  sessionSecret: 'someGoodSecret',
  elasticsearch: _.assign(defaults.elasticsearch, {
    url: 'http://elasticsear.ch:1234'
  })
});
