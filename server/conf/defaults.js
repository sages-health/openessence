'use strict';

// A place to hold default settings. Useful so environments can reference the defaults when they override

var crypto = require('crypto');
var bunyan = require('bunyan');
var PrettyStream = require('bunyan-prettystream');

var prettyStdOut = new PrettyStream({
  mode: 'short' // 'long' is useful if you want to see PID and/or hostname
});
prettyStdOut.pipe(process.stdout);

var env = process.env.NODE_ENV || 'development';

var logger = bunyan.createLogger({
  name: 'fracas',
  serializers: bunyan.stdSerializers,
  streams: [
    // human-readable output on stdout
    {
      level: 'debug',
      type: 'raw',
      stream: prettyStdOut
    },

    // machine-readable output in log file
    {
      level: 'info',
      type: 'rotating-file',
      path: __dirname + '/../../logs/fracas.log',
      period: '1d', // rotate daily, bunyan doesn't support size-based rotation :(
      count: 3 // number of back copies
    }
  ]
});

module.exports = {
  env: env,
  port: process.env.PORT || 9000,
  logger: logger,

  // Connect session middleware secret: http://www.senchalabs.org/connect/session.html
  // using a random secret means sessions won't be preserved across server restarts
  sessionSecret: crypto.randomBytes(1024).toString('hex'),

  // Base port for PhantomJS cluster. Worker n is assigned phantomBasePort + n, e.g. 12301 for the first worker.
  // 12300 is the default port number used by phantom-cluster. We specify it here in case they ever change it.
  // https://github.com/dailymuse/phantom-cluster/blob/87ebc9f2c5fc81792aa4c98ae1c6cf44c784cc5e/index.coffee#L105
  phantomBasePort: 12300,

  // elasticsearch settings, duh
  elasticsearch: {
    url: 'http://localhost:9200'
    // potentially more settings
  }
};
