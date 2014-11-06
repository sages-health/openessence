'use strict';


var gulp = require('gulp');

var clean = require('../server/migrations/clean');
var reseed = require('../server/migrations/reseed');

gulp.task('es-clean', clean);

// Delete all your Fracas data and reseed. Obviously, this should be run with extreme caution.
gulp.task('reseed', ['es-clean'], reseed);
