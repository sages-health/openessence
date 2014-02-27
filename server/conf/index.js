'use strict';

var _ = require('lodash');
var fs = require('fs');
var path = require('path');
var winston = require('winston');

var env = process.env.NODE_ENV || 'development';
process.env.NODE_ENV = env;
exports.env = env;

var envFile = path.join(__dirname, env) + '.js';

if (!fs.existsSync(envFile)) {
  throw new Error('No such settings file ' + envFile);
}

var envSettings = require('./' + env);
var settings = envSettings.settings; // TODO clean this up

// elasticsearch settings
var es = _.assign({
  url: 'http://localhost:9200'
}, settings.ES_SETTINGS);
settings.ES_SETTINGS = es;
exports.es = es;

// flat settings
settings = _.assign({
  // using random secret means sessions won't be preserved through server restarts
  SESSION_SECRET: require('crypto').randomBytes(1024).toString('hex')
}, settings);
exports.settings = settings;

_.forOwn(settings, function (value, name) {
  // Clients may lookup settings from the environment. Keep this in mind when adding new settings!
  process.env[name] = _.isString(value) ? value : JSON.stringify(value);
});

// logging
var slf4jLevels = { // SLF4j's levels are much saner than winston's
  levels: {
    // TRACE is controversial, see http://slf4j.org/faq.html#trace
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
  },
  colors: {
    // same as winston's default colors for these levels
    debug: 'blue',
    info: 'green',
    warn: 'yellow',
    error: 'red'
  }
};
var logger = envSettings.logger || new winston.Logger({
  transports: [
    new winston.transports.Console({
      level: 'info',
      timestamp: true
    })
  ]
});
logger.setLevels(slf4jLevels.levels);
winston.addColors(slf4jLevels.colors);
exports.logger = logger;
