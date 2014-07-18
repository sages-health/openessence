'use strict';

var gulp = require('gulp');

gulp.task('fonts', function () {
  var getFontFiles = function (path) {
    return ['.eot', '.svg', '.ttf', '.woff'].map(function (ext) {
      return path + ext;
    });
  };

  // TODO rev once we start injecting font names into our LESS
  return gulp.src(getFontFiles('bower_components/fracas-fonts/**/*'))
    .pipe(gulp.dest('dist/public/fonts'));
});
