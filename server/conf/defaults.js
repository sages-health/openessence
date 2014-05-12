'use strict';

// A place to hold default settings. Useful so environments can reference the defaults when they override

var _ = require('lodash');
var crypto = require('crypto');
var bunyan = require('bunyan');
var PrettyStream = require('bunyan-prettystream');

var prettyStdOut = new PrettyStream({
  mode: 'short' // 'long' is useful if you want to see PID and/or hostname
});
prettyStdOut.pipe(process.stdout);

var env = process.env.NODE_ENV || 'development';

var createLogger = function (name) {
  var serializers = _.assign({
    user: function userSerializer (user) {
      return {
        id: user.id
        // possibly more fields we deem useful...
      };
    }
  }, bunyan.stdSerializers);

  return bunyan.createLogger({
    name: name,
    serializers: serializers,
    streams: [
      // human-readable output on stdout
      {
        // we don't want any noise besides the red/green lights when we run tests
        level: env === 'test' ? 'warn' : 'debug',
        type: 'raw',
        stream: prettyStdOut
      }

      // TODO machine-readable output in log file
      // We need log rotation, but bunyan's implementation has issues
      // (see https://github.com/trentm/node-bunyan/pull/97 for example). Log rotation is a big enough problem that
      // it should be handled independently, e.g. by logrotate on Linux. All the more reason to deploy to a managed
      // container.
    ]
  });
};

var logger = createLogger('fracas');

function ElasticSearchLogger () {
  var logger = createLogger('elasticsearch');

  this.error = logger.error.bind(logger);
  this.warning = logger.warn.bind(logger);
  this.info = logger.info.bind(logger);
  this.debug = logger.debug.bind(logger);
  this.trace = function (method, requestUrl, body, responseBody, responseStatus) {
    logger.trace({
      method: method,
      requestUrl: requestUrl,
      body: body,
      responseBody: responseBody,
      responseStatus: responseStatus
    });
  };
  this.close = function () {};
}

var port = process.env.PORT || 9000;

module.exports = {
  env: env,
  logger: logger,
  port: port,
  url: process.env.URL || 'http://localhost:' + port,

  // Connect session middleware secret: http://www.senchalabs.org/connect/session.html
  // Using a random secret means sessions won't be preserved across server restarts, but we'd need a persistent
  // session store for that anyway
  sessionSecret: crypto.randomBytes(1024).toString('hex'),

  phantom: {
    enabled: true,

    // Base port for PhantomJS cluster. Worker n is assigned basePort + n, e.g. 12301 for the first worker.
    // 12300 is the default port number used by phantom-cluster. We specify it here in case they ever change it.
    // https://github.com/dailymuse/phantom-cluster/blob/87ebc9f2c5fc81792aa4c98ae1c6cf44c784cc5e/index.coffee#L105
    basePort: 12300
  },

  // elasticsearch settings, duh
  elasticsearch: {
    host: 'http://localhost:9200',
    log: ElasticSearchLogger,
    apiVersion: '1.0'
  },

  // Database settings. Fracas doesn't use a relational database, but we still need connection info for things like
  // importing data. If you're not using a features that require connecting to a DB, then you can skip this.
  db: {
    url: 'jdbc:postgresql://localhost:5432/fracas',
    user: 'postgres',
    password: '',
    driver: 'org.postgresql.Driver'
  }
};
