'use strict';

var cluster = require('cluster');
var http = require('http');
var https = require('https');

var conf = require('./server/conf');
var logger = conf.logger;

// require index.js up here so any initialization errors cause us to immediately exit
var app = require('./server/index');

if (module.parent) {
  throw new Error('server.js must be run in its own process');
}

/**
 *
 * @param [callback] - Optional callback
 */
var startServer = function (callback) {
  if (conf.ssl.enabled) {
    https.createServer({key: conf.ssl.key, cert: conf.ssl.cert}, app)
      .listen(conf.ssl.port);
  }

  // If we're running behind TLS, then our HTTP server just redirects to HTTPS
  http.createServer(app).listen(conf.httpPort, callback);
};

if (cluster.isMaster) {
  logger.info('Running in %s mode', conf.env);

  if (conf.phantom.enabled) {
    // start PhantomJS cluster
    var phantom = require('./server/phantom');
    var fork = require('child_process').fork;
    var phantomChild = fork(__dirname + '/server/phantom');

    phantomChild.on('message', function (message) {
      if (message.started) {
        phantom.started = true; // TODO promise?
        phantom.childProcess = phantomChild;
      }
    });
    phantomChild.on('error', function (err) {
      logger.error({err: err}, 'PhantomJS child process error');
    });
    phantomChild.on('exit', function () {
      logger.info('PhantomJS child process exited');
    });
  } else {
    logger.info('Skipping PhantomJS');
  }

  var onServerListening = function () {
    // This message isn't just to be friendly. We really only support running Fracas at one URL, since it makes
    // a lot of things, e.g. redirects, a lot easier. This log statement helps nudge the admin into using the preferred
    // URL.
    logger.info('Fracas started successfully. Please use %s for all your disease surveillance needs', conf.url);

    // if we have a parent, tell them we started
    if (process.send) {
      process.send({
        started: true,
        url: conf.url
      });
    }
  };

  var debug = process.execArgv.some(function (arg) {
    // Regex taken from https://github.com/joyent/node/commit/43ec1b1c2e77d21c7571acd39860b9783aaf5175
    return /^(--debug|--debug-brk)(=\d+)?$/.test(arg);
  });

  // Debugging is annoying with multiple processes, since even if you give each worker a separate debug port, you need
  // to pick one to connect to. It's easiest to just not fork when we're debugging.
  // See https://github.com/joyent/node/issues/5318
  if (debug) {
    logger.warn('Disabling clustering in debug mode');

    return startServer(function (err) {
      if (err) { // I don't think listen can return an error...
        return logger.error(err);
      }

      onServerListening();
    });
  }

  // otherwise, we're using clustering

  logger.info('Forking %d Fracas workers from parent process %d', conf.workers, process.pid);

  cluster.on('online', function (worker) {
    logger.info('Worker %d is now online', worker.process.pid);
  });

  cluster.once('listening', onServerListening);

  cluster.on('exit', function (worker) {
    logger.warn('Worker %d died. Restarting now...', worker.process.pid);
    cluster.fork();
  });

  for (var i = 0; i < conf.workers; i++) {
    cluster.fork();
  }
} else {
  // cluster workers
  startServer();
}
