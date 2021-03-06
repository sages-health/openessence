'use strict';

var express = require('express');
var conf = require('./conf');
var logger = conf.logger;
var env = conf.env;
var packageJson = require('../package.json');
var fs = require('fs');

var browserify;
var watchify;
var transform;
var less;

if (env === 'development') {
  // Don't move these requires outside this conditional, they're dev dependencies only.
  // We use these so that you don't have to do a build or watch in development.
  browserify = require('browserify');
  watchify = require('watchify');
  transform = require('./transform');
  less = require('less-middleware');

  // prevent ENOENT when .tmp doesn't exist
  require('mkdirp').sync(__dirname + '/../.tmp');

  exports['static'] = function () {
    var app = express();

    // these get written by bundle(), which should be called on server start
    app.use('/public/scripts/libs.js', express.static(__dirname + '/../.tmp/libs.js'));
    app.use('/js/app.js', express.static(__dirname + '/../.tmp/app.js'));
    app.use('/locale', express.static(__dirname + '/../.tmp/locale'));

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

    app.use('/public/fonts', express.static(__dirname + '/../bower_components/font-awesome/fonts'));

    // only assets that are actually requested from here are images and source maps
    app.use('/public', express.static(__dirname + '/../public'));

    return app;
  };
} else if (env === 'production') {
  exports['static'] = function () {
    var app = express();

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
    app.use('/locale', express.static(__dirname + '/../dist/locale', cacheOptions));

    // Lato isn't going to change. And if it does, we can just change the font name.
    // TODO icon font does change a lot, so it's useful to hash that, and hashing Lato doesn't hurt
    // TODO figure out a non-ugly way to pass the hashes into less files
    app.use('/public/fonts/lato', express.static(__dirname + '/../dist/public/fonts/lato', cacheOptions));
    app.use('/public/fonts/', express.static(__dirname + '/../dist/public/font-awesome', cacheOptions));

    // don't set Cache-Control on anything else
    app.use('/public', express.static(__dirname + '/../dist/public'));

    return app;
  };
} else {
  throw new Error('Unknown environment ' + env);
}

// external is a NOOP for all the deps we don't actually use on the client, but it's easier and faster
// than calculating the set of deps we actually use
exports.externalLibs = Object.keys(packageJson.dependencies)
  .concat(Object.keys(packageJson.devDependencies))
  .concat(Object.keys(packageJson.browser));

exports.bundle = function () {
  // How this works:
  //
  // First, the app.js bundle is built. This contains our code, i.e. everything but third-party libraries (which
  // end up in the libs.js bundle). We serve two JS bundles, rather than a single huge one, because huge files
  // cause browser devtools to perform painfully slow (parsing gigantic source maps doesn't help). With two files,
  // app.js can stay small enough that debugging it in the browser is still feasible. Libs.js can get too large
  // for browsers to comfortably handle, but you shoudn't have to debug into libs nearly as much.
  //
  // As part of building app.js, we have a custom browserify transform that collects the libs that the app.js bundle
  // uses. Thus, after app.js is built we know exactly what libs to bundle together into libs.js. Unfortunately,
  // this means we can't build app.js and libs.js in parallel, but that's a small price to pay.
  //
  // This is all a little hacky, but it works. A better solution would be to split up the client into a separate
  // project with its own package.json. This way, you know exactly what libs to include in libs.js, i.e. every
  // dep listed in package.json. But splitting the client into a separate project brings its own issues.
  //
  // Known issues:
  //
  // When watching for changes, dependencies won't get removed from libs if you're not using them anymore. This is
  // because the transform that finds the libs we're using only runs on the changed files, and not globally.
  // Note that restarting the server will cause a full browserify rebuild and give you the correct deps.
  // Moral of the story: just restart the server if you're worried. It doesn't take that long, and if you're using
  // Redis for your session store (which you should be doing) you won't even have to sign back in.

  var libs = {};
  var appBundle = watchify(browserify(__dirname + '/../public/scripts/app.js', {
    // this speeds up the build but means we can't use node-isms like __filename
    detectGlobals: false,
    debug: true,

    // watchify needs these options
    cache: {},
    packageCache: {},
    fullPaths: true
  })
    .external(exports.externalLibs)
    .transform('browserify-ngannotate')
    .transform('partialify')
    .transform(transform.shim)
    .transform(transform.findLibs(function (err, lib) {
      if (err) {
        return logger.error(err);
      }

      libs[lib] = true;
    })));

  var libsBundle;

  var bundleApp = function () {
    if (libsBundle) {
      // make sure libs doesn't build while we're building app
      libsBundle.close();
      libsBundle.removeAllListeners();
    }

    logger.debug('Bundling app.js...');
    appBundle.bundle()
      .pipe(fs.createWriteStream(__dirname + '/../.tmp/app.js'))
      .on('finish', function () {
        libsBundle = watchify((function () {
          return browserify({
            detectGlobals: false,
            noParse: true,
            debug: true,

            // watchify needs these options
            cache: {},
            packageCache: {},
            fullPaths: true
          })
            .require(Object.keys(libs));
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

        bundleLibs();
      });
  };

  appBundle.on('update', bundleApp)
    .on('time', function (millis) {
      logger.debug('Finished bundling app.js (took %ds)', millis / 1000);
    })
    .on('error', function (err) {
      logger.error({err: err, msg: 'Error bundling app.js'});
    });

  bundleApp();

  return appBundle;
};
