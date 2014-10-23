'use strict';

var express = require('express');
var path = require('path');
var conf = require('./conf');
var fs = require('fs');
var os = require('os');
var crypto = require('crypto');
var phantom = require('phantom');
var logger = conf.logger;

module.exports = function () {
  var app = express();

  var getFilename = function (filename, user) {
    return crypto.createHash('sha1')
      .update(filename + user.username)
      .digest('hex');
  };


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

  app.put('/:name', function (req, res) {
    var fracasUrl = req.protocol + '://' + req.hostname + ':' + conf.httpPort;
    var reportUrl = fracasUrl + req.body.url;
    var filename = getFilename(req.params.name, req.user);
    var selector = req.body.selector;

    req.url = '/' + reportUrl;

    var respond = function (extension) {
      var size = req.body.size;
      if (!size) {
        if (extension === '.pdf') {
          size = 'A4'; // ISO standard, even if USA uses Letter
        } else {
          size = '1240px';
        }
      }

      var file = path.normalize(os.tmpdir() + '/' + filename + extension);

      phantom.create(function (ph) {
        console.log('token: ' + req.user.doc.tokens);
        ph.createPage(function (page) {
          page.set('customHeaders', { // FIXME server is still throwing 403
            Authorization: 'Bearer ' + req.user.doc.tokens[0]
          });
          setPageSize({output: file, size: size}, page);
          page.open(reportUrl, function (status) {
            logger.info('PhantomJS rendering URL %s to file %s. Status [%s]', reportUrl, file, status);
            setTimeout(function () {
              if(selector){
                page.evaluate((function () {
                  var func = function (s) {
                    /* global document*/
                    return document.querySelector('#' + s).getBoundingClientRect();
                  };
                  return 'function() { return (' + func.toString() + ').apply(this, ' + JSON.stringify([selector]) + ');}';
                }()), function (value) {
                  page.clipRect = value;
                  page.set('clipRect', value);
                  page.render(file, function () {
                    logger.info('PhantomJS done rendering %s', file);
                    ph.exit();
                    res.status(200).end();
                  });
                });
              } else {
                page.render(file, function () {
                  logger.info('PhantomJS done rendering %s', file);
                  ph.exit();
                  res.status(200).end();
                });
              }
            }, 1000); // not sure if this helps, but it's what the examples use -cjh updated to 1000 from 5000
          });
        });
      });

    };

    // content negotiation
    res.format({
      // PDFs are often blank where PNGs work fine, so for now default to PNG
      // see https://github.com/ariya/phantomjs/issues/11968
      'image/png': function () {
        respond('.png');
      },
      'image/jpeg': function () {
        respond('.jpg');
      },
      'image/gif': function () {
        respond('.gif');
      },
      'application/pdf': function () {
        respond('.pdf');
      }
    });
  });

  app.get('/:name', function (req, res) {
    var filename = getFilename(req.params.name, req.user);
    var download = function (extension) {
      var filepath = path.normalize(os.tmpdir() + '/' + filename + extension);
      res.download(filepath, req.params.name + extension, function () {
        fs.exists(filepath, function (exists) {
          if (exists) {
            fs.unlink(filepath);
          }
        });
      });
    };
    // content negotiation
    res.format({
      // PDFs are often blank where PNGs work fine, so for now default to PNG
      // see https://github.com/ariya/phantomjs/issues/11968
      'image/png': function () {
        download('.png');
      },
      'image/jpeg': function () {
        download('.jpg');
      },
      'image/gif': function () {
        download('.gif');
      },
      'application/pdf': function () {
        download('.pdf');
      }
    });
  });

  return app;
};
