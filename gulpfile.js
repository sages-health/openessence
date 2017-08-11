'use strict';

var gulp = require('gulp');
var gutil = require('gulp-util');
var del = require('del');
var _ = require('lodash');
var fs = require('fs');
var defaults = require('./server/conf/defaults');
var git = require('gulp-git');
var shell = require('gulp-shell');

// load all tasks in tasks directory
require('require-dir')('./tasks');

var settings = defaults;

var gitHash;

// TODO use gulp-changed

// TODO get livereload working with https://github.com/mollerse/gulp-embedlr

//gulp.task('watch', function () {
//  // TODO do this instead of middleware to simplify the codebase (but complicate the build)
//});

gulp.task('clean', function (callback) {
  del([
    'dist',
    '.tmp'
  ], callback);
});

gulp.task('git-hash', function(callback){
  return git.revParse(
        {
          args:'--short HEAD'
        }, 
        function(err,hash){
          gitHash = hash;
          callback();
        });
});

gulp.task('setVariables', ['git-hash'], function(){

});

gulp.task('build', ['git-hash', 'setVariables', 'images', 'fonts', 'views', 'translations']);

// alias for now, but could be more in the future
gulp.task('lint', ['jshint']);

gulp.task('test', ['lint', 'tests']);

gulp.task('rebuild-db', ['clean-db', 'build-db']);

gulp.task('clean-db', [], shell.task("node server/migrations/clean"));

gulp.task('build-db', [], shell.task("node server/migrations/reseed"));



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