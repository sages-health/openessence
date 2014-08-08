'use strict';

var gulp = require('gulp');
var browserify = require('browserify');
var htmlmin = require('gulp-htmlmin');
var ngmin = require('gulp-ngmin'); // TODO switch to ng-annotate
var uglify = require('gulp-uglify');
var buffer = require('gulp-buffer');
var rev = require('gulp-rev');
var replace = require('gulp-replace');
var header = require('gulp-header');
var footer = require('gulp-footer');
var source = require('vinyl-source-stream');
var path = require('path');
var transformTools = require('browserify-transform-tools');
var assets = require('../server/assets');
var jsLibs = assets.libs();
var noParseLibs = assets.noParseLibs();


/**
 * Minifies partials and converts them to a JS string that can be `require`d. Partials are included in the app.js
 * bundle.
 */
gulp.task('partials', function () {
  /*jshint quotmark:false */

  return gulp.src('public/**/*.html')
    .pipe(htmlmin({
      collapseWhitespace: true,
      collapseBooleanAttributes: true,
      removeComments: true,
      removeAttributeQuotes: false,
      removeRedundantAttributes: true,
      removeEmptyAttributes: true,
      removeOptionalTags: false // removing is probably a bad idea with partial docs
    }))
    // inspired by https://github.com/visionmedia/node-string-to-js/blob/master/index.js
    .pipe(replace(/'/g, "\\'"))
    .pipe(replace(/\r\n|\r|\n/g, '\\n'))

    // wrap HTML in module
    .pipe(header("module.exports='"))
    .pipe(footer("';"))

    .pipe(gulp.dest('.tmp/public/')); // write to .tmp so they can be read by browserify
});

/**
 * Build 3rd-party JavaScript libraries.
 */
gulp.task('libs', function () {
  var bundle = browserify({
    noParse: noParseLibs
  });

  jsLibs.forEach(function (lib) {
    bundle.require(lib);
  });

  return bundle
    .bundle() // TODO use pre-built bundles
    .pipe(source('libs.js'))
    .pipe(buffer()) // gulp-rev doesn't like streams, so convert to buffer
    .pipe(uglify({
      preserveComments: 'some' // preserve license headers
    }))
    .pipe(rev())
    .pipe(gulp.dest('dist/public/scripts/'));
});

/**
 * Build 1st-party JavaScript libraries.
 */
gulp.task('scripts', ['partials'], function () {
  // transform that replaces references to `require`d partials with their minified versions in .tmp,
  // e.g. a call to require('../partials/foo.html') in public/scripts would be replaced by
  // require('../../.tmp/public/partials/foo.html')
  var minifyPartials = transformTools.makeRequireTransform('partialTransform',
    {evaluateArguments: true},
    function (args, opts, cb) {
      var file = args[0];
      if (path.extname(file) !== '.html') {
        return cb();
      }

      var root = path.resolve(__dirname, '..');

      var referrerDir = path.dirname(opts.file); // directory of file that has the require() call
      var tmp = path.resolve(root, '.tmp');
      var tmpResource = path.resolve(referrerDir, file).replace(root, tmp); // path to required tmp resource
      var relativePath = path.relative(referrerDir, tmpResource).replace(/\\/g, '/');

      cb(null, 'require("' + relativePath + '")');
    });

  var appBundle = browserify()
    .add(__dirname + '/../public/scripts/app.js')
    .transform(minifyPartials);

  jsLibs.forEach(function (lib) {
    appBundle.external(lib);
  });

  return appBundle
    .bundle()
    .pipe(source('app.js')) // convert stream of text to stream of Vinyl objects for gulp
    .pipe(buffer()) // ngmin, et al. don't like streams, so convert to buffer
    .pipe(ngmin())
    .pipe(uglify({
      preserveComments: 'some' // preserve license headers
    }))
    .pipe(rev())
    .pipe(gulp.dest('dist/public/scripts'));
});
