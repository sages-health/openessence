'use strict';

var gulp = require('gulp');
var path = require('path');
var fork = require('child_process').fork;
var url = require('url');
var request = require('request');
var conf = require('../server/conf');

gulp.task('es-clean', function (done) {
  var reqUrl = url.parse(conf.elasticsearch.host);
  reqUrl.pathname = '/_all';

  // equivalent to curl -XDELETE <URL>/_all
  request.del(url.format(reqUrl), function (err) {
    done(err);
  });
});

// Delete everything in your elasticsearch cluster and reseed your data. Obviously, this should be run with extreme
// caution.
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
