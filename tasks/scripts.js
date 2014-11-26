'use strict';

var gulp = require('gulp');
var gutil = require('gulp-util');
var browserify = require('browserify');
var htmlmin = require('html-minifier').minify;
var ngAnnotate = require('gulp-ng-annotate');
var uglify = require('gulp-uglify');
var buffer = require('gulp-buffer');
var rev = require('gulp-rev');
var source = require('vinyl-source-stream');
var path = require('path');
var fs = require('fs');
var assets = require('../server/assets');
var transform = require('../server/transform');
var transformTools = require('browserify-transform-tools');


gulp.task('scripts', function (done) {
  gutil.log('Building the scripts can take a few seconds. Please be patient.');

  var libs = {};

  var appBundle = browserify({
    detectGlobals: false
  })
    .add(__dirname + '/../public/scripts/app.js')
    .transform(transform.shim)
    .transform(transformTools.makeRequireTransform('minifyPartials', {}, function (args, opts, cb) {
      /*jshint quotmark:false */

      var file = args[0];
      if (path.extname(file) !== '.html') {
        return cb();
      }

      var fullPath = path.resolve(path.dirname(opts.file), file);
      fs.readFile(fullPath, {encoding: 'utf8'}, function (err, data) {
        if (err) {
          return cb(err);
        }

        var html = htmlmin(data, {
          collapseWhitespace: true,
          collapseBooleanAttributes: true,
          removeComments: true,
          removeAttributeQuotes: false,
          removeRedundantAttributes: true,
          removeEmptyAttributes: true,
          removeOptionalTags: false // removing is probably a bad idea with partial docs
        })
          .replace(/'/g, "\\'")
          .replace(/\r\n|\r|\n/g, '\\n');

        cb(null, "'" + html + "'");
      });
    }))
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
