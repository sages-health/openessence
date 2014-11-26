'use strict';

var express = require('express');
var conf = require('./conf');
var logger = conf.logger;
var env = conf.env;
var packageJson = require('../package.json');
var fs = require('fs');
var cluster = require('cluster');

// Libs that are resolved from npm, but still belong in external bundle. The browser-libs field is our own invention.
// We need to have this list up front so we know what to add to libs.js
// TODO dynamically generate this w/ a browserify transform
var npmLibsForBrowser = packageJson['browser-libs'];

/**
 * Returns a list of JavaScript packages that should be bundled together in libs.js.
 */
exports.libs = function () {
  var bowerLibs = Object.keys(packageJson.browser);
  return bowerLibs.concat(Object.keys(npmLibsForBrowser));
};

/**
 * Libs that don't have to be parsed by browserify, typically because they do not use require() or node-style globals.
 * Not parsing such libs can shave a few seconds off the build.
 * Note that shimmed libs MUST be parsed by browserify, since browserify-shim inserts require() calls into them.
 * @returns Array of absolute filenames
 */
exports.noParseLibs = function () {
  return Object.keys(npmLibsForBrowser)
    .filter(function (lib) {
      // set `"parse": true` in package.json if the lib should be parsed, e.g. because it loads dependencies via
      // require()
      return !npmLibsForBrowser[lib].parse;
    })
    .map(function (lib) {
      return require.resolve(lib);
    });
};

/**
 * Returns an express app that serves static resources that do not require authentication.
 */
exports.static = function () {
  var app = express();
  if (env === 'development') {
    // Don't move these requires outside this conditional, they're dev dependencies only.
    // We use these so that you don't have to do a build or watch in development.
    var less = require('less-middleware');
    var browserify = require('browserify');
    var watchify = require('watchify');
    var transform = require('./transform');

    // TODO calculate this dynamically
    var libs = exports.libs();

    if (cluster.isMaster) { // make sure we only bundle once
      var libsBundle = watchify((function () {
        var bundle = browserify({
          detectGlobals: false,
          noParse: true,

          // watchify needs these options
          cache: {},
          packageCache: {},
          fullPaths: true
        });
        libs.forEach(function (lib) {
          bundle.require(lib);
        });

        return bundle;
      })());

      var bundleLibs = function () {
        logger.debug('Bundling libs.js...');
        libsBundle.bundle()
          .pipe(fs.createWriteStream(__dirname + '/../.tmp/libs.js'));
      };

      libsBundle.on('update', bundleLibs)
        .on('time', function (millis) {
          logger.debug('Finished bundling libs.js (took %ds)', millis / 1000);
        })
        .on('error', function (err) {
          logger.error({err: err, msg: 'Error bundling libs.js'});
        });
      bundleLibs(); // build on startup

      var appBundle = watchify((function () {
        var bundle = browserify(__dirname + '/../public/scripts/app.js', {
          // this speeds up the build but means we can't use node-isms like __filename
          detectGlobals: false,

          // watchify needs these options
          cache: {},
          packageCache: {},
          fullPaths: true
        })
          .transform('browserify-ngannotate')
          .transform('partialify')
          .transform(transform.shim);

        libs.forEach(function (lib) {
          bundle.external(lib);
        });

        return bundle;
      })());

      var bundleApp = function () {
        logger.debug('Bundling app.js...');
        appBundle.bundle()
          .pipe(fs.createWriteStream(__dirname + '/../.tmp/app.js'));
      };

      appBundle.on('update', bundleApp)
        .on('time', function (millis) {
          logger.debug('Finished bundling app.js (took %ds)', millis / 1000);
        })
        .on('error', function (err) {
          logger.error({err: err, msg: 'Error bundling app.js'});
        });

      bundleApp(); // build on startup
    }

    app.use('/public/scripts/libs.js', express.static(__dirname + '/../.tmp/libs.js'));
    app.use('/js/app.js', express.static(__dirname + '/../.tmp/app.js'));

    app.use('/public/styles', less(__dirname + '/../public/styles', {
        compiler: {
          sourceMap: true,
          compress: false // no point in development
        },
        parser: {
          paths: [__dirname + '/../bower_components', __dirname + '/../node_modules']
        }
      }));

    // TODO angular-gettext middleware instead
    app.use('/public/translations', express.static(__dirname + '/../dist/public/translations'));

    app.use('/public/fonts', express.static(__dirname + '/../bower_components/fracas-fonts'));

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

    // Lato isn't going to change. And if it does, we can just change the font name.
    // TODO icon font does change a lot, so it's useful to hash that, and hashing Lato doesn't hurt
    // TODO figure out a non-ugly way to pass the hashes into less files
    app.use('/public/fonts/lato', express.static(__dirname + '/../dist/public/fonts/lato', cacheOptions));

    // don't set Cache-Control on anything else
    app.use('/public', express.static(__dirname + '/../dist/public'));
  } else {
    throw new Error('Unknown environment ' + env);
  }

  return app;
};
