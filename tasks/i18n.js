'use strict';

var gulp = require('gulp');
var path = require('path');
var gettext = require('gulp-angular-gettext');

/**
 * Extract translatable strings into a PO template file.
 */
gulp.task('pot', function () {
  gulp.src(['public/**/*.html', 'public/**/*.js'])
    .pipe(gettext.extract('fracas.pot', {
      postProcess: function (po) {
        po.items.forEach(function (item) {
          item.references = item.references.map(function (ref) {
            return path.relative(path.join(__dirname, '../po'), ref)
              .replace(/\\/g, '/'); // replace any Windows-style paths
          });
        });
      }
    }))
    .pipe(gulp.dest('po/'));
});

/**
 * Convert PO files into JSON for consumption by the front-end.
 */
gulp.task('translations', function () {
  gulp.src('po/*.po')
    .pipe(gettext.compile({
      format: 'json'
    }))
    .pipe(gulp.dest('dist/public/translations/'));
});
