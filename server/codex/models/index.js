'use strict';

var glob = require('glob');
var path = require('path');

module.exports = glob.sync(__dirname + '/*.js')
  .filter(function (filename) {
    return path.basename(filename) !== 'index.js';
  }).map(function (filename) {
    var Model = require('./' + path.basename(filename));
    return new Model();
  });
