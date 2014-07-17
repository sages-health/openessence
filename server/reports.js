'use strict';

var express = require('express');
var path = require('path');
var conf = require('./conf');
var phantom = require('./phantom');

module.exports = function () {
  var app = express();
  app.put('/:name', function (req, res) {
    var fracasUrl = req.protocol + '://' + req.host + ':' + conf.httpPort;
    var reportUrl = fracasUrl + '/api' + req.body.url;

    req.url =  '/' + reportUrl;

    var respond = function (extension) {
      var size = req.query.size;
      if (!size) {
        if (extension === '.pdf') {
          size = 'A4'; // ISO standard, even if USA uses Letter
        } else {
          size = '1240px';
        }
      }
      phantom.enqueue({
        url: reportUrl,
        output: path.normalize(__dirname + '/../reports/' + req.params.name + extension),
        size: size,
        token: req.user.token // execute with user's permission
      });

      res.send(202); // "Accepted"
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

  app.get('/:name', function (req, res, next) {
    // TODO implement this
    next();
//  res.sendfile(getReportFilename(req.params.name));
  });

  return app;
};
