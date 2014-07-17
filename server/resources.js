'use strict';

var changeCase = require('change-case');
var express = require('express');
var codex = require('./codex');
var controllers = require('./controllers')();

module.exports = function () {
  var app = express();

  Object.keys(controllers).forEach(function (name) {
    var mountPoint = '/' + changeCase.paramCase(name).replace(/-controller$/, '');
    app.use(mountPoint, codex.middleware(controllers[name]));
  });

  return app;
};
