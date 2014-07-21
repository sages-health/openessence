'use strict';

var gulp = require('gulp');
var mocha = require('gulp-mocha');
var istanbul = require('gulp-istanbul');
var karma = require('karma');
var join = require('path').join;

var paths = {
  serverTests: 'test/server/**/*.js',
  clientTests: 'test/client/**/*.js'
};

var mochaTransform = function () {
  return mocha({
    ui: 'bdd',
    reporter: 'nyan'
  });
};

// if we want integration tests, we can split this into server-unit-tests and server-integration tests
gulp.task('server-tests', function () {
  return gulp.src(paths.serverTests, {read: false})
    .pipe(mochaTransform());
});

// these are unit tests, integration/e2e tests would use Protractor as the test runner
gulp.task('client-tests', function (cb) {
  // FIXME this doesn't work
  karma.server.start({configFile: join(__dirname, '../test/client/karma.conf.js')}, function () {
    cb(null);
  });
});

gulp.task('tests', ['server-tests'], function (cb) {
  gulp.src(['server/**/*.js'])
    .pipe(istanbul())
    .on('finish', function () {
      gulp.src([paths.serverTests])
        .pipe(mochaTransform())
        .pipe(istanbul.writeReports({
          reporters: ['lcov', 'html', 'text'],
          reportOpts: {dir: join(__dirname, '../.tmp/coverage')}
        }))
        .on('end', cb);
    });
});
