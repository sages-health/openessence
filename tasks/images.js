'use strict';

var gulp = require('gulp');
var imagemin;
try {
  imagemin = require('gulp-imagemin');
} catch (e) {
  // this can happen sometimes, e.g. https://github.com/npm/npm/issues/6043
  console.warn('Error requiring gulp-imagmin. Not minifying images', e.stack);
  imagemin = null;
}

var svgmin = require('gulp-svgmin');

var paths = {
  imagesDest: 'dist/public/images'
};

// Minifying JPGs, PNGs, and GIFs requires native libs which can be annoying to install on Windows, so
// they're all optional dependencies (see https://github.com/kevva/image-min). If the package isn't installed,
// we don't do the minification.

var loadLib = function (lib) {
  try {
    return require(lib);
  } catch (e) {
    return false;
  }
};

var imageLibs = {
  jpeg: !!imagemin && loadLib('jpegtran-bin'),
  png: !!imagemin && loadLib('pngquant-bin'),
  gif: !!imagemin && loadLib('gifsicle')
};

var imageminTransform = function () {
  return imagemin({
    optimizationLevel: 3,
    progressive: true,
    interlaced: true
  });
};

gulp.task('jpgs', function () {
  var pipeline = gulp.src(['public/images/**/*.jpg', 'public/images/**/*.jpeg']);

  if (imageLibs.jpeg) {
    pipeline = pipeline.pipe(imageminTransform());
  } else {
    console.warn('jpegtran-bin not installed. Not minifying jpgs');
  }

  return pipeline.pipe(gulp.dest(paths.imagesDest));
});

gulp.task('pngs', function () {
  var pipeline = gulp.src(['public/images/**/*.png']);
  if (imageLibs.png) {
    pipeline = pipeline.pipe(imageminTransform());
  } else {
    console.warn('pngquant-bin not installed. Not minifying pngs');
  }

  return pipeline.pipe(gulp.dest(paths.imagesDest));
});

gulp.task('gifs', function () {
  var pipeline = gulp.src(['public/images/**/*.gif']);
  if (imageLibs.gif) {
    pipeline = pipeline.pipe(imageminTransform());
  } else {
    console.warn('gifsicle not installed. Not minifying gifs');
  }

  return pipeline.pipe(gulp.dest(paths.imagesDest));
});

gulp.task('svgs', function () {
  return gulp.src('public/images/**/*.svg')
    .pipe(svgmin())
    .pipe(gulp.dest('dist/public/images'));
});

gulp.task('images', ['jpgs', 'pngs', 'gifs', 'svgs'], function () {
  return gulp.src('public/images/*.ico')
    .pipe(gulp.dest('dist/public/images'));
});
