'use strict';

if (module.parent) {
  // This is the parent process, just like Unix fork()
  module.exports = {
    // this should be set to true by the parent process after they receive notice from the child process that the
    // engine has started
    started: false,

    // the child process phantom-cluster is running in
    childProcess: null,

    // enqueue a phantom-cluster request
    enqueue: function (request) {
      module.exports.childProcess.send({
        request: request
      });
    }
  };
  return;
}

// This is the child process. phantom-cluster must be run in a separate process

var phantomCluster = require('phantom-cluster');
var cluster = require('cluster');
var path = require('path');
var conf = require('./conf');
var logger = conf.logger;

var engine = phantomCluster.createQueued({
  workers: 2,
  workerIterators: 4, // default of 100 is a little high when we might only get 1 report a day
  phantomBasePort: conf.phantom.basePort,
  phantomArguments: [/*'--ignore-ssl-errors=true'*/]
});

engine.on('workerStarted', function (worker) {
  logger.info('PhantomJS cluster worker %s started', worker.id);
});

engine.on('workerDied', function (worker) {
  logger.info('PhantomJS cluster worker %s died', worker.id);
});

engine.on('stopped', function () {
  logger.warn('PhantomJS cluster stopped');
});

engine.on('phantomStarted', function () {
  logger.info('PhantomJS instance started');
});

engine.on('phantomDied', function () {
  logger.info('PhantomJS instance stopped');
});

var setPageSize = function (request, page) {
  // inspired by https://github.com/ariya/phantomjs/blob/master/examples/rasterize.js
  page.set('viewportSize', {
    width: 600,
    height: 600
  });
  if (path.extname(request.output) === '.pdf') {
    page.set('paperSize', (function () {
      var size = request.size.split('*');
      if (size.length === 2) { // e.g. '5in*7.5in', '10cm*20cm'
        return {
          width: size[0],
          height: size[1],
          margin: '0px'
        };
      } else { // e.g. 'Letter', 'A4'
        return {
          format: request.size,
          orientation: 'portrait',
          margin: '1cm'
        };
      }
    })());
  } else if (request.size.substr(-2) === 'px') {
    // '1920px' would render the entire page, with a window width of 1920px
    // '800px*600px' would clip the image to 800*600
    // ...at least I think that's what happens
    var size = request.size.split('*');
    if (size.length === 2) { // e.g. '800px*600px'
      var pageWidth = parseInt(size[0], 10);
      var pageHeight = parseInt(size[1], 10);
      page.set('viewportSize', {
        width: pageWidth,
        height: pageHeight
      });
      page.set('clipRect', {
        top: 0,
        left: 0,
        width: pageWidth,
        height: pageHeight
      });
    } else {
      page.set('viewportSize', (function () {
        var pageWidth = parseInt(request.size, 10); // yes, parseInt works even with 'px' in the string
        var pageHeight = parseInt(pageWidth * 3/4, 10);
        return {
          width: pageWidth,
          height: pageHeight
        };
      })());
    }
  } else if (request.size) {
    logger.warn('Unknown size %s', request.size);
  }

  if (request.zoom) {
    page.set('zoomFactor', request.zoom);
  }
};

engine.on('queueItemReady', function (request) {
  logger.info('PhantomJS cluster received request for %s', request.url);
  var clusterClient = this;
  this.ph.createPage(function (page) {
    page.set('customHeaders', { // FIXME server is still throwing 403
      Authorization: 'Bearer ' + request.token
    });

    setPageSize(request, page);

    page.open(request.url, function (status) {
      if (status === 'fail') {
        logger.error('PhantomJS failed to open %s', request.url);
        clusterClient.queueItemResponse(request);
        return;
      }

      page.get('content', function (content) {
        logger.debug('PhantomJS requested %s and got\n%s', request.url, content);
      });

      logger.info('PhantomJS rendering URL %s to file %s', request.url, request.output);
      setTimeout(function () {
        page.render(request.output, function () {
          logger.info('PhantomJS done rendering %s', request.output);
          clusterClient.queueItemResponse(request);
        });
      }, 200); // not sure if this helps, but it's what the examples use
    });
  });
});

engine.on('started', function () {
  if (process.send) {
    // let parent know we started
    process.send({
      // we can't set module.exports.started = true ourselves because that's in our process space (not our parent's)
      // and it's only really useful to our parent
      started: true
    });
  }
});

// when parent process sends us a request, pass it along to cluster
process.on('message', function (message) {
  if (message.request) {
    if (cluster.isMaster) {
      // there's some funky node-cluster stuff going on, but checking for isMaster is what the example code does
      // before enqueuing, otherwise we get an error because engine is a client instance
      // https://github.com/dailymuse/phantom-cluster/blob/master/example.coffee
      engine.enqueue(message.request);
    }
  }
});

engine.start();
