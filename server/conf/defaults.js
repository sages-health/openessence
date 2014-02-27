'use strict';

// A place to hold default settings. Useful so environments can reference the defaults when they override

var crypto = require('crypto');
var winston = require('winston');

var env = process.env.NODE_ENV || 'development';

// logging
var slf4jLevels = { // SLF4j's levels are much saner than winston's, TODO switch to bunyan or something else better
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
var logger = new winston.Logger({
  transports: [
    new winston.transports.Console({
      level: 'info',
      timestamp: true
    })
  ]
});
logger.setLevels(slf4jLevels.levels);
winston.addColors(slf4jLevels.colors);

module.exports = {
  env: env,

  // Connect session middleware secret: http://www.senchalabs.org/connect/session.html
  // using a random secret means sessions won't be preserved across server restarts
  sessionSecret: crypto.randomBytes(1024).toString('hex'),

  logger: logger,
  elasticsearch: {
    url: 'http://localhost:9200'
    // potentially more settings
  }
};
