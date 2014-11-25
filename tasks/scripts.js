'use strict';

var gulp = require('gulp');
var browserify = require('browserify');
var htmlmin = require('gulp-htmlmin');
var ngAnnotate = require('gulp-ng-annotate');
var uglify = require('gulp-uglify');
var buffer = require('gulp-buffer');
var rev = require('gulp-rev');
var replace = require('gulp-replace');
var header = require('gulp-header');
var footer = require('gulp-footer');
var source = require('vinyl-source-stream');
var assets = require('../server/assets');
var transform = require('../server/transform');
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
    noParse: noParseLibs,
    fullPaths: false
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
  var appBundle = browserify()
    .add(__dirname + '/../public/scripts/app.js')
    .transform(transform.shim)
    .transform(transform.partials);

  jsLibs.forEach(function (lib) {
    appBundle.external(lib);
  });

  return appBundle
    .bundle()
    .pipe(source('app.js')) // convert stream of text to stream of Vinyl objects for gulp
    .pipe(buffer()) // ngmin, et al. don't like streams, so convert to buffer
    .pipe(ngAnnotate({
      add: true,
      singleQuotes: true
    }))
    .pipe(uglify({
      preserveComments: 'some' // preserve license headers
    }))
    .pipe(rev())
    .pipe(gulp.dest('dist/public/scripts'));
});
