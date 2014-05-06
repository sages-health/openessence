'use strict';

var fs = require('fs');
var path = require('path');
var defaults = require('./defaults');

var env = defaults.env;
process.env.NODE_ENV = env;

var configFile = path.join(__dirname, 'config.js');
var envFile = path.join(__dirname, env) + '.js';

var settings = defaults;

// apply global config first, then environment-specific config
if (fs.existsSync(configFile)) {
  // use whatever is returned from the settings function or fall back to using settings as an out parameter
  settings = require(configFile)(settings) || settings;
}

if (fs.existsSync(envFile)) {
  settings = require(envFile)(settings) || settings;
} else {
  defaults.logger.warn('No configuration for the current environment ("%s") found', env);
  defaults.logger.warn('Using the default configuration');
}

module.exports = settings;
