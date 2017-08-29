'use strict';

var gulp = require('gulp');

gulp.task('fonts', ['fracas-fonts', 'font-awesome', 'roboto']);

gulp.task('fracas-fonts', function () {
  var getFontFiles = function (path) {
    return ['.eot', '.svg', '.ttf', '.woff'].map(function (ext) {
      return path + ext;
    });
  };

  // TODO rev once we start injecting font names into our LESS
  return gulp.src(getFontFiles('bower_components/fracas-fonts/**/*'))
    .pipe(gulp.dest('dist/public/fonts'));
});

gulp.task('font-awesome', function () {
  var getFontFiles = function (path) {
    return ['.eot', '.svg', '.ttf', '.woff', '.woff2'].map(function (ext) {
      return path + ext;
    });
  };

  
  return gulp.src(getFontFiles('bower_components/font-awesome/fonts/*'))
    .pipe(gulp.dest('dist/public/fonts'));
});

gulp.task('roboto', function () {
  var getFontFiles = function (path) {
    return ['.eot', '.svg', '.ttf', '.woff', '.woff2'].map(function (ext) {
      return path + ext;
    });
  };

  
  return gulp.src(getFontFiles('public/styles/fonts/*'))
    .pipe(gulp.dest('dist/public/fonts'));
});