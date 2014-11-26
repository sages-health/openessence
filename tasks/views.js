'use strict';

var gulp = require('gulp');
var fs = require('fs');
var htmlmin = require('gulp-htmlmin');

// Although we do a lot of processing in middleware, this task is still useful to replace references to resources
// with references to revved versions.
gulp.task('inject', ['styles', 'scripts'], function () {
  var inject = require('gulp-inject');
  var glob = require('glob');

  var getLatestFile = function (path) {
    var maxFile = '';
    var maxTime = -1;

    // this I/O should probably be async and in a stream instead, but this is a lot easier
    glob.sync(path)
      .forEach(function (file) {
        var mtime = fs.statSync(file).mtime.getTime();
        if (mtime > maxTime) {
          maxTime = mtime;
          maxFile = file;
        }
      });

    return maxFile;
  };

  return gulp.src('views/index.html')
    .pipe(inject(gulp.src(getLatestFile('dist/public/styles/*.css'), {read: false}), {
      ignorePath: '/dist'
    }))
    .pipe(inject(gulp.src(getLatestFile('dist/public/scripts/libs-*.js'), {read: false}), {
      starttag: '<!-- inject:libs:{{ext}} -->',
      ignorePath: '/dist'
    }))
    .pipe(inject(gulp.src(getLatestFile('dist/public/scripts/app-*.js'), {read: false}), {
      ignorePath: '/dist'
    }))
    .pipe(gulp.dest('dist/views'));
});

gulp.task('views', ['inject'], function () {
  return gulp.src(['views/**/*.html', '!views/index.html', 'dist/views/**/*.html'])
    .pipe(htmlmin({
      collapseWhitespace: true,
      collapseBooleanAttributes: true,
      removeComments: true,
      removeAttributeQuotes: false,
      removeRedundantAttributes: true,
      useShortDoctype: true, // enforces what we already do
      removeEmptyAttributes: true,
      removeOptionalTags: true
    }))
    .pipe(gulp.dest('dist/views'));
});
