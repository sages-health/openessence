'use strict';

var express = require('express');
var env = require('./conf').env;

/**
 * Returns a list of JavaScript packages that should be bundled together in libs.js.
 */
exports.libs = function () {
  var packageJson = require('../package.json');
  var bowerLibs = Object.keys(packageJson.browser);

  // Libs that are resolved from npm, but still belong in external bundle. The browser-libs field is our own invention
  var npmLibsForBrowser = packageJson['browser-libs'];

  return bowerLibs.concat(npmLibsForBrowser);
};

/**
 * Returns an express app that serves static resources that do not require authentication.
 */
exports.anonymous = function () {
  var app = express();
  if (env === 'development') {
    // Don't move these requires outside this conditional, they're dev dependencies only.
    // We use these so that you don't have to do a build or watch in development.
    var browserify = require('browserify-middleware');
    var less = require('less-middleware');

    var libs = exports.libs();
    app.use('/public/scripts/libs.js', browserify(libs, {
      // can't use noParse with browserify-shim
      // noParse: bowerLibs
    }));
    app.use('/js/app.js', browserify('../public/scripts/app.js', {
      // Make require('partial.html') work.
      // In production, we use a custom version of this that also minifies the partials
      transform: ['partialify'],
      external: libs
    }));

    app.use('/public/styles', less({
      src: __dirname + '/../public/styles',
      paths: [__dirname + '/../public/bower_components', __dirname + '/../node_modules'],
      sourceMap: true,
      compress: false // no point in development
    }));

    // TODO angular-gettext middleware instead
    app.use('/public/translations', express.static(__dirname + '/../dist/public/translations'));

    app.use('/public', express.static(__dirname + '/../public'));
  } else if (env === 'test') {
    app.use('/test', express.static(__dirname + '/../test'));
  } else if (env === 'production') {
    var cacheOptions = {
      // 1 year is the max allowed according to the relevant RFC.
      // Express takes it in milliseconds while HTTP takes it in seconds
      maxage: 31556926000,

      // ETags are still useful for when the cache does expire
      etag: true
    };

    // this means all assets in /styles or /scripts need to be hashed, otherwise they'll be cached too long
    app.use('/public/styles', express.static(__dirname + '/../dist/public/styles', cacheOptions));
    app.use('/public/scripts', express.static(__dirname + '/../dist/public/scripts', cacheOptions));

    // don't set Cache-Control on anything else
    app.use('/public', express.static(__dirname + '/../dist/public'));
  } else {
    throw new Error('Unknown environment ' + env);
  }

  return app;
};

/**
 * Returns an express app that serves static Kibana resources.
 */
exports.kibana = function () {
  var app = express();
  if (env === 'development') {
    app.use(express.static(__dirname + '/../kibana/src'));
  } else if (env === 'test') {
    app.use(express.static(__dirname + '/../kibana/dist'));
  } else if (env === 'production') {
    app.use(express.static(__dirname + '/../kibana/dist'));
  } else {
    throw new Error('Unknown environment ' + env);
  }

  return app;
};
