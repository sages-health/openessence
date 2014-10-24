'use strict';

var express = require('express');
var conf = require('./conf');
var request = require('request');
var url = require('url');


module.exports = function reportsMiddleware () {
  var app = express();

  app.get('/:name', function (req, res) {
    var token = req.user.doc.tokens[0];

    var phantomUrl = url.parse(conf.phantom.url);
    phantomUrl.pathname = '/' + req.params.name;
    phantomUrl.query = req.query;

    // send request to Phantom
    request.get(url.format(phantomUrl), {
      auth: {
        bearer: token
      }
    }).pipe(res);
  });

  return app;
};
