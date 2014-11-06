#!/usr/bin/env node
'use strict';

var fork = require('child_process').fork;
var path = require('path');

// Run schema.js, then seeds.js, then date-shift.js
function reseed (done) {
  var schema = fork(path.resolve(__dirname, 'schema.js'));
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

    var seed = fork(path.resolve(__dirname, 'seeds.js'));
    seed.on('error', function (err) {
      childErr = err;
      return done(err);
    });
    seed.on('exit', function () {
      if (childErr) {
        return;
      }

      var dateShift = fork(path.resolve(__dirname, 'date-shift.js'));
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
}

if (module.parent) {
  module.exports = reseed;
} else {
  reseed(function (err) {
    if (err) {
      console.error(err);
    }
  });
}
