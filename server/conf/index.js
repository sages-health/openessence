'use strict';

var crypto = require('crypto');
var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var defaults = require('./defaults');

var env = defaults.env;
process.env.NODE_ENV = env;

var configFile = path.resolve(__dirname, '../..', 'config/settings.js');
var settings = defaults;

if (fs.existsSync(configFile)) {
  // use whatever is returned from the settings function or fall back to using settings as an out parameter
  settings = require(configFile)(settings) || settings;
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

if (!settings.session.secret) {
  var secret;
  Object.defineProperty(settings.session, 'secret', {
    enumerable: true,
    // lazily initialize secret so we don't yell at the user unnecessarily
    // TODO split conf up so we don't load session conf unless we're using it
    get: function () {
      if (!secret) {
        console.warn('Using random session secret. Please set one before you run in production, as a random one will ' +
          'not be persisted nor work with multiple worker processes');

        secret = crypto.randomBytes(1024).toString('hex');
        if (settings.workers > 1) {
          /*jshint quotmark:false */
          // can't have each worker process using different random secrets
          throw new Error("You must set a session secret if you're using more than one worker process");
        }
      }

      return secret;
    }
  });
}

if (settings.session.store === 'memory' && settings.workers > 1) {
  // Without sticky sessions, there's no guarantee a client request will be routed to the process that has the existing
  // session. This is why sessions should be stored in a shared store like Redis.
  throw new Error('Cannot have more than 1 worker with an in-memory session store');
}

// use shared Redis connection
if (!settings.redis.client) {
  var redis = require('redis');
  var redisUrl = require('url').parse(settings.redis.url);
  var redisPass;

  if (redisUrl.auth) {
    var auth = redisUrl.auth.split(':');
    if (auth.length === 2) {
      redisPass = auth[1];
      // Redis only uses passwords, so the username can be ignored
    } else {
      // ignore the username and move on
    }
  }

  var redisClient;
  Object.defineProperty(settings.redis, 'client', {
    enumerable: true,
    get: function () { // lazily initialize redis connection so Redis doesn't have to be online unless we're using it
      if (!redisClient) {
        redisClient = redis.createClient(redisUrl.port, redisUrl.hostname, {
          'auth_pass': redisPass
        });
      }
      return redisClient;
    }
  });
}

if (!settings.elasticsearch.client) {
  var elasticsearch = require('elasticsearch');

  // share client instance
  var client;
  Object.defineProperty(settings.elasticsearch, 'client', {
    get: function () {
      if (!client) { // lazily initialize so we don't get spam about connecting to elasticsearch
        client = new elasticsearch.Client(_.clone(settings.elasticsearch));
      }

      return client;
    }
  });

  // Create a new client. Useful for one-off processes that want to close their connection after they're done.
  Object.defineProperty(settings.elasticsearch, 'newClient', {
    value: function () {
      return new elasticsearch.Client(_.clone(settings.elasticsearch));
    }
  });
}

module.exports = settings;
