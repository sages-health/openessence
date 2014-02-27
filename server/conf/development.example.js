'use strict';

var _ = require('lodash');
var winston = require('winston');
var defaults = require('./defaults');

module.exports = _.assign(defaults, {
  sessionSecret: 'someGoodSecret',
  logger: new winston.Logger({
    transports: [
      new winston.transports.Console({
        level: 'debug',
        timestamp: true
      })
    ]
  }),
  elasticsearch: _.assign(defaults.elasticsearch, {
    url: 'http://elasticsear.ch:1234'
  })
});
