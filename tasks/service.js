'use strict';

var gulp = require('gulp');
var gutil = require('gulp-util');
var os = require('os');
var path = require('path');

/**
 * Install Fracas as a service so that it starts automatically on boot. If anything goes wrong on Windows,
 * you can delete the service with `sc delete fracas.exe`, which should be run as an admin.
 */
gulp.task('service', function (done) {
  if (os.platform() !== 'win32') {
    // TODO install launchd/upstart/systemd/SMF/SysV script on *nix platforms
    return done(new Error('Sorry, we only support installing a Windows service right now'));
  }

  var Service;
  try {
    Service = require('node-windows').Service;
  } catch (e) {
    gutil.log(gutil.colors.red('Couldn\'t load node-windows. Did you run ' +
      '`npm install -g node-windows && npm link node-windows`?'));
    return done(e);
  }

  var svc = new Service({
    name: 'Fracas',
    description: 'Disease surveillance webapp',
    script: path.join(__dirname, '../server.js'),
    env: [
      {
        name: 'NODE_ENV',
        value: 'production'
      }
    ]
  });
  svc.on('start', function () {
    gutil.log('Service started successfully. Happy Fracasing :)');
    done();
  });
  svc.on('install', function () {
    svc.start();
  });

  svc.install();
});
