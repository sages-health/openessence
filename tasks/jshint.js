'use strict';

var gulp = require('gulp');
var jshint = require('gulp-jshint');

/**
 * Lint server-side JavaScript.
 */
gulp.task('jshint-server', function () {
  return gulp.src(['*.js', 'server/**/*.js', 'tasks/**/*.js', 'test/**/*.js'])
    .pipe(jshint())
    .pipe(jshint.reporter('jshint-stylish'))
    .pipe(jshint.reporter('fail'));
});

/**
 * Lint client-side JavaScript.
 */
gulp.task('jshint-client', function () {
  return gulp.src(['public/**/*.js'])
    .pipe(jshint())
    .pipe(jshint.reporter('jshint-stylish'))
    .pipe(jshint.reporter('fail'));
});

gulp.task('jshint', ['jshint-server', 'jshint-client']);
