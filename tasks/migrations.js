'use strict';

var gulp = require('gulp');

gulp.task('es-clean', function (done) {
  // eagerly requiring clean causes spurious elasticsearch connection logs
  var clean = require('../server/migrations/clean');
  clean(done);
});

// Delete all your Fracas data and reseed. Obviously, this should be run with extreme caution.
gulp.task('reseed', ['es-clean'], function (done) {
  var reseed = require('../server/migrations/reseed');
  reseed(done);
});
