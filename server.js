'use strict';

var http = require('http');
var https = require('https');

var app = require('./server/index');
var conf = require('./server/conf');
var logger = conf.logger;

var startPhantom = function () {
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
};

if (!module.parent) {
  logger.info('Running in %s mode', conf.env);

  if (conf.phantom.enabled) {
    startPhantom();
  } else {
    logger.info('Skipping PhantomJS');
  }

  var serverStarted = function () {
    // This message isn't just to be friendly. We really only support running Fracas at one URL, since it makes
    // a lot of things, e.g. redirects, a lot easier. This log statement helps nudge the admin into using the preferred
    // URL.
    logger.info('Please use %s for all your disease surveillance needs', conf.url);

    // if we have a parent, tell them we started
    if (process.send) {
      process.send({
        started: true,
        url: conf.url
      });
    }
  };

  if (conf.ssl.enabled) {
    logger.info('SSL enabled. Starting HTTPS and HTTP server');

    https.createServer({key: conf.ssl.key, cert: conf.ssl.cert}, app)
      .listen(conf.ssl.port, function () {
        logger.info('Fracas listening for HTTPS connections on port %d', conf.ssl.port);
        serverStarted();
      });

    // app handles redirects
    http.createServer(app).listen(conf.httpPort, function () {
      logger.info('Fracas listening for HTTP connections on port %d', conf.httpPort);
    });
  } else {
    logger.info('SSL disabled. Starting HTTP server only');

    http.createServer(app).listen(conf.httpPort, function () {
      logger.info('Fracas listening for HTTP connections on port %d', conf.httpPort);
      serverStarted();
    });
  }
}
