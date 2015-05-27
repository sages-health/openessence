'use strict';

var express = require('express');
var conf = require('./conf');
var logger = conf.logger;
var Locale = require('./models/Locale');

module.exports = function reportsMiddleware () {
  var app = express();

  app.get('/', function (req, res) {
    var lng = req.query.lng;
    var ns = req.query.ns;
    Locale.getLocaleByLngNS(lng, ns, function (err, locale) {
      if (err) {
        console.log('Error locating translation!');
      }

      if (!locale) {
        logger.info('Could not find translation for %s: %s', lng, ns);
        res.send({});
      } else{
        res.send(locale.translation);
      }
    });

  });

  return app;
};
