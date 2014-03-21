'use strict';

var _ = require('lodash');
var fs = require('fs');
var path = require('path');
var defaults = require('./defaults');

var env = defaults.env;
process.env.NODE_ENV = env;
var envFile = path.join(__dirname, env) + '.js';

var config = defaults;
if (fs.existsSync(envFile)) {
  config = _.assign(defaults, require(envFile));
} else {
  defaults.logger.warn('No configuration for the current environment ("' + env + '") found');
  defaults.logger.warn('Using the default configuration');
}

module.exports = config;
