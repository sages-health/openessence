'use strict';

var gulp = require('gulp');
var replace = require('gulp-replace');
var rename= require('gulp-rename');
var gutil = require('gulp-util');
var del = require('del');
var _ = require('lodash');
var fs = require('fs');
var defaults = require('./server/conf/defaults');
var git = require('git-rev-sync');

// load all tasks in tasks directory
require('require-dir')('./tasks');

var settings = defaults;

// TODO use gulp-changed

// TODO get livereload working with https://github.com/mollerse/gulp-embedlr

//gulp.task('watch', function () {
//  // TODO do this instead of middleware to simplify the codebase (but complicate the build)
//});

gulp.task('clean', function (callback) {
  del([
    'dist',
    '.tmp',
    'public/outpatient/leaflet-map.js',
    'public/partials/home.html'
  ], callback);
});

gulp.task('setVariables', function(){
  gulp.src('public/partials/templates/home.template.html')
    .pipe(replace('%%repo-url%%', settings.REPO_URL ? settings.REPO_URL : 'https://github.com/sages-health/openessence'))
    .pipe(replace('%%git-commit-hash%%', git.short()))
    .pipe(rename('public/partials/home.html'))
    .pipe(gulp.dest('./'));
    

  gulp.src(['public/scripts/templates/leaflet-map.template.js'])
  .pipe(replace(/%%baseMapURL%%/g, settings.MAP_URL !== undefined ? settings.MAP_URL : "''"))
  .pipe(replace(/%%baseLatitude%%/g, settings.MAP_LATITUDE !== undefined ? settings.MAP_LATITUDE : '41.4925'))
  .pipe(replace(/%%baseLongitude%%/g, settings.MAP_LONGITUDE !== undefined ? settings.MAP_LONGITUDE : '-99.9018'))
  .pipe(rename("public/outpatient/leaflet-map.js"))
  .pipe(gulp.dest('./'));

});

gulp.task('build', ['setVariables', 'images', 'fonts', 'views', 'translations']);

// alias for now, but could be more in the future
gulp.task('lint', ['jshint']);

gulp.task('test', ['lint', 'tests']);


gulp.task('server', ['build'], function (callback) {
  var fork = require('child_process').fork;
  var open = require('open');
  var env = _.clone(process.env);
  env.NODE_ENV = 'development';

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
