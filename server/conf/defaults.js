'use strict';

// A place to hold default settings. Useful so environments can reference the defaults when they override

var _ = require('lodash');
var fs = require('fs');
var url = require('url');
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
      if (!user) {
        return null;
      }
      if (typeof user.codexModel === 'function') {
        user = user.doc;
      }

      return {
        id: user.id,
        username: user.username,
        roles: user.roles
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

function ElasticSearchLogger () {
  var logger = createLogger('elasticsearch.js');

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

var certPath = process.env.SSL_CERT || __dirname + '/../../cert.pem';
var keyPath = process.env.SSL_KEY || __dirname + '/../../key.pem';
var sessionStore = process.env.SESSION_STORE || 'memory'; // 'redis' is also accepted

module.exports = {
  env: env,
  logger: createLogger('fracas'),

  appName: process.env.APP_NAME || 'Fracas',

  ssl: {
    enabled: fs.existsSync(certPath) && fs.existsSync(keyPath),
    certPath: certPath,
    keyPath: keyPath
    // more properties are defined in ./index.js
  },

  // Number of Fracas worker processes. Note that the default session store saves sessions in memory, and thus
  // will not work with more than one worker. A shared session store like Redis should therefore be used in production.
  workers: (function () {
    var workers = process.env.WORKERS || (sessionStore === 'memory' ? 1 : 2);
    if (workers === 'NUM_CPUS') {
      workers = require('os').cpus().length;
    } else {
      workers = parseInt(workers, 10);
    }

    return workers;
  })(),

  phantom: {
    enabled: process.env.PHANTOM !== 'false',

    // Base port for PhantomJS cluster. Worker n is assigned basePort + n, e.g. 12301 for the first worker.
    // 12300 is the default port number used by phantom-cluster. We specify it here in case they ever change it.
    // https://github.com/dailymuse/phantom-cluster/blob/87ebc9f2c5fc81792aa4c98ae1c6cf44c784cc5e/index.coffee#L105
    basePort: 12300
  },

  // Define extra users. The auth layers checks if a user is defined here first and then checks if the user is in the
  // data store. This is useful for development: instead of every Fracas instance having a known set of test users,
  // e.g. "admin", "test", etc. and having to make sure those accounts are disabled or their passwords changed before
  // deployment, you can include them in conf instead. Settings users to `false` will disable the pre-registration
  // requirement and grant all Persona users admin privileges.
  users: process.env.USERS === 'false' ? false : {
    // example local user
//    admin: {
//      roles: ['admin']
//    }

    // example Persona user
//    'foo@bar.com' : {
//      roles: ['entry']
//    }
  },

  persona: {
    enabled: true
  },

  proxy: {
    // true if Fracas is running behind a reverse proxy
    enabled: !!process.env.PROXY || false
  },

  session: {
    // Session store. Accepted values are currently 'memory' and 'redis'. Memory is fine for development, but Redis
    // should be used in production to provide persistence and the ability to scale past a single web server process.
    store: sessionStore,

    // Secret used to sign cookies
    secret: process.env.SESSION_SECRET
  },

  redis: {
    url: process.env.REDIS_URL || (function () {
      if (process.env.REDISCLOUD_URL) {
        // Heroku addons automatically add environment variables. We might as well use them to make installation
        // easier. There are a number of Redis providers, but Redis Cloud offers 25MB free and Redis 2.8 instances.
        // Redis To Go is the only other free Redis provider (as of Sept. 2014) but they put free customers on Redis
        // 2.4 instances. We need 2.6.12+ for our locks.
        return process.env.REDISCLOUD_URL;
      }

      if (process.env.REDIS_PORT) {
        // If we're running in a Docker container that's linked against a container with alias `redis`, then Docker will
        // set REDIS_PORT to be the tcp port of the linked container

        var parsedRedisPort = url.parse(process.env.REDIS_PORT);
        if (parsedRedisPort.protocol === 'tcp:') {
          // Docker sets the protocol of the port to be tcp since it operates below the application layer. You can
          // also tell Docker to use UDP instead, but Redis speaks TCP, so why would we ever do that?
          parsedRedisPort.protocol = 'redis:';
        }

        return url.format(parsedRedisPort);
      }

      // Fallback to Redis's default
      return 'redis://localhost:6379';
    })(),
    password: process.env.REDIS_PASSWORD // Redis doesn't use usernames, just tokens
  },

  // elasticsearch settings, duh
  elasticsearch: {
    // Found.no is nice since they give you unlimited indices. But they're (currently) $40/month. Bonsai has fewer
    // features and limits the number of indices, but they do have a free tier.
    host: process.env.ELASTICSEARCH_URL || process.env.FOUNDELASTICSEARCH_URL || process.env.BONSAI_URL ||
      (function () {
        if (process.env.ELASTICSEARCH_PORT) {
          // If we're running in a Docker container that's linked against a container with alias `elasticsearch`, then
          // Docker will set ELASTICSEARCH_PORT to be the tcp port of the linked container

          var parsedElasticsearchPort = url.parse(process.env.ELASTICSEARCH_PORT);
          if (parsedElasticsearchPort.protocol === 'tcp:') {
            // Docker sets the protocol of the port to be tcp since it operates below the application layer. You can
            // also tell Docker to use UDP instead, but Elasticsearch speaks TCP (via HTTP), so why would we ever do that?
            parsedElasticsearchPort.protocol = 'http:';
          }

          return url.format(parsedElasticsearchPort);
        }

        // Fallback to Elasticsearch's default
        return 'http://localhost:9200';
      })(),
    log: ElasticSearchLogger,
    apiVersion: '1.1'
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
