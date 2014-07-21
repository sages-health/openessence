'use strict';

var gulp = require('gulp');
var async = require('async');
var fs = require('fs');

// TODO this requires openssl to be on your PATH, see https://github.com/andris9/pem/issues/20
var pem = require('pem');

gulp.task('cert', function (done) {
  pem.createCertificate({days: 1000, selfSigned: true}, function (err, keys) {
    if (err) {
      return done(err);
    }

    async.parallel([
      function (callback) {
        fs.writeFile(__dirname + '/../key.pem', keys.serviceKey, callback);
      },
      function (callback) {
        fs.writeFile(__dirname + '/../cert.pem', keys.certificate, callback);
      }
    ], done);
  });
});
