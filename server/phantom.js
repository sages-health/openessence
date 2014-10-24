'use strict';

var phantomCluster = require('phantom-cluster');
var cluster = require('cluster');
var path = require('path');
var express = require('express');
var fs = require('fs');
var mime = require('mime-types');
var http = require('http');
var url = require('url');
var tmp = require('tmp');
var passport = require('passport');
var BearerStrategy = require('passport-http-bearer').Strategy;
var Boom = require('boom');

var conf = require('./conf');
var logger = conf.logger;
var User = require('./models/User');

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
  logger.debug('PhantomJS instance started');
});

engine.on('phantomDied', function () {
  logger.info('PhantomJS instance stopped');
});

engine.on('queueItemReady', function (options) {
  logger.info('PhantomJS cluster received request for %s', options.url);

  var clusterClient = this;
  this.ph.createPage(function (page) {
    page.set('customHeaders', {
      Authorization: 'Bearer ' + options.user.doc.tokens[0]
    });

    var setPageSize = function () {
      // inspired by https://github.com/ariya/phantomjs/blob/master/examples/rasterize.js
      page.set('viewportSize', {
        width: 600,
        height: 600
      });
      if (path.extname(options.filename) === '.pdf') {
        page.set('paperSize', (function () {
          var size = options.size.split('*');
          if (size.length === 2) { // e.g. '5in*7.5in', '10cm*20cm'
            return {
              width: size[0],
              height: size[1],
              margin: '0px'
            };
          } else { // e.g. 'Letter', 'A4'
            return {
              format: options.size,
              orientation: 'portrait',
              margin: '1cm'
            };
          }
        })());
      } else if (options.size.substr(-2) === 'px') {
        // '1920px' would render the entire page, with a window width of 1920px
        // '800px*600px' would clip the image to 800*600
        // ...at least I think that's what happens
        var size = options.size.split('*');
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
            var pageWidth = parseInt(options.size, 10); // yes, parseInt works even with 'px' in the string
            var pageHeight = parseInt(pageWidth * 3/4, 10);
            return {
              width: pageWidth,
              height: pageHeight
            };
          })());
        }
      } else if (options.size) {
        logger.warn('Unknown size %s', options.size);
      }
    };

    setPageSize();

    page.open(options.url, function () {
      logger.info('PhantomJS rendering %s to %s', options.url, options.filename);
      setTimeout(function () {
        if (options.selector) {
          page.evaluate((function () {
            var func = function (s) {
              /* global document*/
              return document.querySelector('#' + s).getBoundingClientRect();
            };
            return 'function() { return (' + func.toString() + ').apply(this, ' + JSON.stringify([options.selector]) + ');}';
          }()), function (value) {
            page.clipRect = value;
            page.set('clipRect', value);
          });
        }

        page.render(options.filename, function () {
          logger.info('PhantomJS done rendering %s', options.filename);
          clusterClient.queueItemResponse(options);
        });

      }, 1000);
    });
  });
});


engine.start();

if (cluster.isMaster) {
  // expose HTTP API for submitting requests to Phantom
  var app = express();

  // log all requests
  app.use(require('morgan')());

  // compressing already compressed formats (PNG, JPG, PDF) is counterproductive
//  app.use(require('compression')());

  passport.use(new BearerStrategy({}, function (token, done) {
    // This means every request hits the DB, but these requests are pretty rare.
    // If they become more frequent we can cache users in Redis, or somehow leverage our existing session store
    User.findByToken(token, function (err, user) {
      if (err) {
        return done(err);
      }

      if (!user) {
        return done(null, false);
      }

      return done(null, user);
    });
  }));

  // all requests have to have bearer tokens on them
  app.use(passport.initialize());
  app.use(passport.authenticate('bearer', {session: false}));
  app.use(require('./auth').denyAnonymousAccess);

  app.get('/:name', function (req, res, next) {
    // PDFs are often blank where PNGs work fine, so for now default to PNG
    // see https://github.com/ariya/phantomjs/issues/11968
    var contentType = req.accepts(['image/png', 'image/jpeg', 'image/gif', 'application/pdf']);
    if (!contentType) {
      return next();
    }

    var extension = mime.extension(contentType);

    // A4 is ISO standard, even if USA uses Letter
    var size = extension === 'pdf' ? 'A4' : '1240px';

    tmp.tmpName({postfix: '.' + extension}, function (err, filename) {
      if (err) {
        return next(err);
      }

      var urlToRender = url.parse(req.query.url);
      var fracasUrl = url.parse(conf.url);

      // Don't allow client to specify these parts of the URL. Otherwise we could end up running an open proxy.
      urlToRender.protocol = fracasUrl.protocol;
      urlToRender.hostname = fracasUrl.hostname;
      urlToRender.port = fracasUrl.port;

      var queueItem = engine.enqueue({
        url: url.format(urlToRender),
        name: req.params.name,
        user: req.user,
        filename: filename,
        selector: req.query.selector,
        size: size
      });
      queueItem.on('response', function () {
        // TODO sanitize file name
        res.download(filename, req.params.name + '.' + extension, function (err) {
          // try to delete file no matter what
          fs.unlink(filename, function () {
            // ignore any errors
          });

          if (err && !res.headersSent) {
            return next(err);
          } else if (err) {
            return logger.error({err: err}, 'Error sending rendered page to client');
          }
        });
      });

      queueItem.on('timeout', function () {
        next(Boom.serverTimeout('PhantomJS timed out rendering page'));
      });

    });

  });

  app.use(require('./error').middleware)
    .use(require('./error').notFound); // this must be the last route

  var phantomUrl = url.parse(conf.phantom.url);
  http.createServer(app).listen(phantomUrl.port, phantomUrl.hostname);
}
