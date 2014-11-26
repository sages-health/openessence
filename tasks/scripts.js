'use strict';

var gulp = require('gulp');
var gutil = require('gulp-util');
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

gulp.task('scripts', ['partials'], function (done) {
  gutil.log('Building the scripts can take a few seconds. Please be patient.');

  var libs = {};

  var appBundle = browserify({
    detectGlobals: false
  })
    .add(__dirname + '/../public/scripts/app.js')
    .transform(transform.shim)
    .transform(transform.partials)
    .transform(transform.findLibs(function (err, lib) {
      if (err) {
        throw err; // whatever
      }

      libs[lib] = true;
    }));

  assets.externalLibs.forEach(function (lib) {
    appBundle.external(lib);
  });

  // we don't return a stream, instead we call the done callback after libs.js is written to disk
  appBundle
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
    .pipe(gulp.dest('dist/public/scripts'))
    .on('finish', function () {
      // This is a little suboptimal since we wait for app.js to be written to disk before starting libs.
      // Really, we could start on libs as soon as the libs hash is populated, i.e. right after app.js's .bundle()
      // finished. But that would require some fancy flow control that's probably not worth the slight perf gain.

      var libsBundle = browserify({
        detectGlobals: false,
        noParse: true
      });
      Object.keys(libs).forEach(function (lib) {
        libsBundle.require(lib);
      });

      libsBundle.bundle() // TODO use pre-built bundles
        .pipe(source('libs.js'))
        .pipe(buffer())
        .pipe(uglify({
          preserveComments: 'some' // preserve license headers
        }))
        .pipe(rev())
        .pipe(gulp.dest('dist/public/scripts'))
        .on('error', done)
        .on('finish', done);
    });
});
