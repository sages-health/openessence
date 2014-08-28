'use strict';

var gulp = require('gulp');
var gutil = require('gulp-util');
var mocha = require('gulp-mocha');
var istanbul = require('gulp-istanbul');
var karma = require('karma');
var glob = require('glob');
var browserify = require('browserify');
var partialify = require('partialify');
var browserifyIstanbul = require('browserify-istanbul');
var source = require('vinyl-source-stream');
var path = require('path');

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

/**
 * Run client (unit) tests with Karma. Since starting Karma and compiling the tests can take some time, this task
 * supports running in "watcher" mode via the `WATCH` environment variable. When `WATCH` is set, tests will be re-run
 * automatically whenever the Javascript changes.
 */
gulp.task('client-tests', function (callback) {
  var watch = 'WATCH' in process.env && process.env.WATCH !== 'false';

  glob(path.resolve(__dirname, '../test/client/*.js'), function (err, testFiles) {
    if (err) {
      return callback(err);
    }

    var run = function (callback) {
      callback = callback || function () {};

      browserify(testFiles)
        .transform(partialify)
        .transform(browserifyIstanbul({
          ignore: ['**/node_modules/**', '**/bower_components/**', '**/test/**']
        }))
        .bundle({debug: true})
        .pipe(source('tests.js'))
        .pipe(gulp.dest('.tmp/'))
        .on('finish', function () {
          karma.server.start(
            {
              basePath: path.resolve(__dirname, '..'),
              frameworks: ['mocha', 'browserify'],
              files: [
                '.tmp/tests.js',
                {pattern: 'public/**/*.js', included: false}
              ],
              exclude: [],
              preprocessors: {
                '**/*.js': ['sourcemap'],
                'public/**/*.js': ['coverage']
              },
              reporters: ['mocha', 'coverage'],
              coverageReporter: {
                type: 'html',
                dir: path.resolve(__dirname, '..', '.tmp/karma-coverage')
              },
              port: 9876,
              colors: true,
              logLevel: 'INFO',
              autoWatch: false, // we do our own watching since we need to browserify
              browsers: ['PhantomJS'],
              singleRun: true // this stops the Karma server even if we're watching, but oh well
            },
            function () {
              karma.runner.run({}, function () {
                callback(null);
              });
            });
        });
    };

    if (watch) {
      var done = function (err) {
        if (err) {
          gutil.log(gutil.colors.red(err));
          // don't quit, errors
        }

        gutil.log(gutil.colors.green('Done running tests. Waiting for changes...'));
      };

      gulp.watch(['test/client/*.js', 'public/**/*.js'], function () {
        gutil.log('Re-running client tests...');
        run(done);
      });

      // still run the first time
      run(done);
    } else {
      // run once
      run(callback);
    }
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
          reportOpts: {dir: path.resolve(__dirname, '../.tmp/coverage')}
        }))
        .on('end', cb);
    });
});
