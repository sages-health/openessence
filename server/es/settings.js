'use strict';

var _ = require('lodash');
var fs = require('fs');
var path = require('path');

exports.getManagedAliases = function getManagedAliases (callback) {
  fs.readdir(__dirname + '../../../indices', function (err, files) {
    if (err) {
      return callback(err);
    }
    var aliases = _.filter(files, function (file) {
      return path.extname(file) === '.js';
    })
      .map(function (file) {
        return path.basename(file, '.js');
      });

    return callback(null, aliases);
  });
};

exports.loadIndexSettings = function loadIndexSettings (index) {
  return require('../../indices/' + index);
};
