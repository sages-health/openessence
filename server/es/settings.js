'use strict';

var _ = require('lodash');
var fs = require('fs');
var path = require('path');

function getAliases (files) {
  return _
    .filter(files, function (file) {
      return path.extname(file) === '.js';
    })
    .map(function (file) {
      return path.basename(file, '.js');
    });
}

exports.getManagedAliases = function getManagedAliases (callback) {
  fs.readdir(__dirname + '../../../indices', function (err, files) {
    if (err) {
      return callback(err);
    }

    return callback(null, getAliases(files));
  });
};

/**
 * Synchronous version of `getManagedAliases`. All the usual caveats of synchronous functions in Node apply.
 * @returns {*} array of strings
 */
exports.getManagedAliasesSync = function getManagedAliasesSync () {
  var files = fs.readdirSync(__dirname + '/../../indices');
  return getAliases(files);
};

exports.loadIndexSettings = function loadIndexSettings (index) {
  return require('../../indices/' + index);
};
