'use strict';

var bluebird = require('bluebird');
var gulp = require('gulp');
var path = require('path');
var fork = require('child_process').fork;
var conf = require('../server/conf');
var logger = conf.logger;
var client = conf.elasticsearch.newClient();

gulp.task('es-clean', function (done) {
  // This will only delete the indexes that our aliases point to. If your cluster has other indexes, or older versions
  // of fracas indexes, they will be left alone.
  var requests = [
    function (callback) {
      client.indices.delete({index: 'fracas_data'}, callback);
    },
    function (callback) {
      client.indices.delete({index: 'fracas_settings'}, callback);
    }
  ];

  // Use fancy promises so that parallel requests aren't killed if one encounters an error
  bluebird.settle(requests.map(function (r) {
    return bluebird.promisify(r)();
  }))
    .then(function (promiseInspections) {
      var errors = promiseInspections.filter(function (pi) {
        return pi.isRejected();
      }).map(function (pi) {
        return pi.error();
      });

      errors.forEach(function (e) {
        logger.error({err: e}, 'Error deleting index');
      });

      var numSuccesses = requests.length - errors.length;
      logger.info('Successfully deleted %d out of %d indices (%d errors)', numSuccesses, requests.length,
        errors.length);
    })
    .catch(function (e) {
      // this shouldn't ever happen, but in case it does we don't want to swallow errors
      logger.error({err: e}, 'Error deleting indices');
    })
    .finally(function () {
      client.close();
      done();
    });
});

// Delete all your Fracas data and reseed. Obviously, this should be run with extreme caution.
gulp.task('reseed', ['es-clean'], function (done) {
  var schema = fork(path.resolve(__dirname, '..', 'server/migrations/schema.js'));
  var childErr;
  schema.on('error', function (err) {
    childErr = err;
    return done(err);
  });

  schema.on('exit', function () {
    if (childErr) {
      // schema encountered an error and then exited, we've already called done(), so nothing left to do
      return;
    }

    var seed = fork(path.resolve(__dirname, '..', 'server/migrations/seeds.js'));
    seed.on('error', function (err) {
      childErr = err;
      return done(err);
    });
    seed.on('exit', function () {
      if (childErr) {
        return;
      }

      var dateShift = fork(path.resolve(__dirname, '..', 'server/migrations/date-shift.js'));
      dateShift.on('error', function (err) {
        childErr = err;
        return done(err);
      });

      dateShift.on('exit', function () {
        if (childErr) {
          return;
        }

        done();
      });
    });
  });
});
