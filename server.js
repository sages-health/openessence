'use strict';

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

  var port = conf.port;

  if (conf.phantom.enabled) {
    startPhantom();
  } else {
    logger.info('Skipping PhantomJS');
  }

  app.listen(port, function () {
    logger.info('Fracas listening on port %s', port);

    // if we have a parent, tell them we started
    if (process.send) {
      process.send({
        started: true,
        url: 'http://localhost:' + port
      });
    }
  });
}
