'use strict';

var fs = require('fs');
var path = require('path');
var _ = require('lodash');
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
}

// Set computed properties after we're done loading properties.
var ssl = settings.ssl.enabled;
var httpPort = process.env.HTTP_PORT || (!settings.ssl.enabled && process.env.PORT) || 9000;
var httpsPort = process.env.HTTPS_PORT || (settings.ssl.enabled ? (process.env.PORT || 9001) : null);

settings = _.assign({
  httpPort: httpPort,
  url: process.env.URL || (ssl ? 'https://localhost:' + httpsPort : 'http://localhost:' + httpPort)
}, settings);

settings.ssl = _.assign({
  cert: ssl ? fs.readFileSync(settings.ssl.certPath) : null,
  key: ssl ? fs.readFileSync(settings.ssl.keyPath) : null,
  port: httpsPort
}, settings.ssl);

module.exports = settings;
