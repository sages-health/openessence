'use strict';

var gulp = require('gulp');
var gutil  = require('gulp-util');
var _ = require('lodash');

// load all tasks in tasks directory
require('require-dir')('./tasks');

// TODO use gulp-changed

// TODO get livereload working with https://github.com/mollerse/gulp-embedlr

//gulp.task('watch', function () {
//  // TODO do this instead of middleware to simplify the codebase (but complicate the build)
//});

gulp.task('clean', function () {
  // recommended over gulp-clean, see https://github.com/peter-vilja/gulp-clean/pull/3
  var rimraf = require('gulp-rimraf');

  return gulp.src(['dist', '.tmp'], {read: false})
    .pipe(rimraf());
});

gulp.task('build', ['images', 'fonts', 'views', 'translations']);

// alias for now, but could be more in the future
gulp.task('lint', ['jshint']);

gulp.task('test', ['lint', 'tests']);


gulp.task('server', ['build'], function (callback) {
  var fork = require('child_process').fork;
  var open = require('open');
  var env = _.clone(process.env);
  env.NODE_ENV = 'production';

  var child = fork(__dirname + '/server.js', [], {
    env: env
  });
  child.on('message', function (m) {
    if (m.started) {
      gutil.log('Opening ' + m.url);
      open(m.url);
    }
  });
  child.on('error', callback);
  child.on('exit', function () {
    callback(null);
  });
});

gulp.task('default', ['build']);
