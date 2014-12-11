/**
 * Miscellaneous browserify transforms we use as part of our build (via browserify directly) or runtime
 * (via browserify-middleware).
 */
'use strict';

// This is a devDependency, so DO NOT require() this file in production!
var transformTools = require('browserify-transform-tools');

module.exports = {
  // Shim libs that export something and aren't already CommonJS modules.
  shim: transformTools.makeRequireTransform('shimTransform', {}, function (args, opts, cb) {
    if (args[0] === 'angular') {
      return cb(null, '(function () {require("angular");return window.angular;})()');
    } else {
      return cb();
    }
  }),

  findLibs: function (callback) {
    return transformTools.makeRequireTransform('findLibsTransform', {}, function (args, opts, cb) {
      if (args[0].charAt(0) !== '.') {
        callback(null, args[0]);
      }

      return cb();
    });
  }
};
