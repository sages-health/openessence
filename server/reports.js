'use strict';

var express = require('express');
var conf = require('./conf');
var request = require('request');
var url = require('url');

module.exports = function reportsMiddleware() {
  var app = express();

  app.get('/:name', function (req, res) {

    var phantomUrl = url.parse(conf.phantom.url);
    phantomUrl.pathname = '/' + req.params.name;
    phantomUrl.query = req.query;

    request.post({
      uri: url.format(phantomUrl),
      headers: {
        'Accept': '*/*'
      },
      json: true,
      body: {user: req.user.doc}
    }).pipe(res);

  });

  return app;
};
