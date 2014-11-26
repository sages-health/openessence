/**
 * Miscellaneous browserify transforms we use as part of our build (via browserify directly) or runtime
 * (via browserify-middleware).
 */
'use strict';

var path = require('path');

// This is a devDependency, so DO NOT require() this file in production!
var transformTools = require('browserify-transform-tools');

module.exports = {
  // transform that replaces references to `require`d partials with their minified versions in .tmp,
  // e.g. a call to require('../partials/foo.html') in public/scripts would be replaced by
  // require('../../.tmp/public/partials/foo.html')
  partials: transformTools.makeRequireTransform('partialsTransform', {evaluateArguments: true},
    function (args, opts, cb) {
      var file = args[0];
      if (path.extname(file) !== '.html') {
        return cb();
      }

      // TODO minify the HTML here instead of writing it to tmp

      var root = path.resolve(__dirname, '..');

      var referrerDir = path.dirname(opts.file); // directory of file that has the require() call
      var tmp = path.resolve(root, '.tmp');
      var tmpResource = path.resolve(referrerDir, file).replace(root, tmp); // path to required tmp resource
      var relativePath = path.relative(referrerDir, tmpResource).replace(/\\/g, '/');

      cb(null, 'require("' + relativePath + '")');
    }),

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
