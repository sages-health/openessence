'use strict';

var glob = require('glob');
var path = require('path');

module.exports = function () {
  return glob.sync(__dirname + '/*.js')
    .filter(function (filename) {
      // exclude current file
      return path.basename(filename) !== path.basename(__filename);
    })
    .reduce(function (controllers, filename) {
      var name = path.basename(filename, '.js');
      controllers[name] = require('./' + name);
      return controllers;
    }, {});
};
