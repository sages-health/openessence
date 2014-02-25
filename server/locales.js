'use strict';

var fs = require('fs');
var path = require('path');
var _ = require('lodash');

exports.getSupportedLocalesSync = function () {
  var files = fs.readdirSync(__dirname + '/../po');
  return _.filter(files, function (f) {
    return path.extname(f) === '.po';
  }).map(function (f) {
    return path.basename(f, '.po');
  });
};
