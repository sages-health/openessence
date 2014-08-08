'use strict';

var gulp = require('gulp');
var less = require('gulp-less');
var autoprefixer = require('gulp-autoprefixer');
var minifycss = require('gulp-minify-css');
var rev = require('gulp-rev');

/**
 * Build CSS for production.
 */
gulp.task('styles', function () {
  return gulp.src('public/styles/main.less') // all other styles are loaded from main
    .pipe(less({
      paths: ['bower_components', 'node_modules']
    }))
    .pipe(autoprefixer('last 2 versions', 'safari 5', 'ie 9', 'ie 10', 'opera 12.1', 'ios 6', 'android 4'))
    .pipe(minifycss())
    .pipe(rev())
    .pipe(gulp.dest('dist/public/styles'));
});
