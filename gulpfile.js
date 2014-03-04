'use strict';

// see http://markgoodyear.com/2014/01/getting-started-with-gulp/
var gulp = require('gulp');
var gutil  = require('gulp-util');
var lazypipe = require('lazypipe');
var less = require('gulp-less');
var autoprefixer = require('gulp-autoprefixer');
var minifycss = require('gulp-minify-css');
var browserify = require('gulp-browserify');
var jshint = require('gulp-jshint');
var uglify = require('gulp-uglify');
var imagemin = require('gulp-imagemin');
var svgmin = require('gulp-svgmin');
var rimraf = require('gulp-rimraf'); // preferred over gulp-clean, see https://github.com/peter-vilja/gulp-clean/pull/3
var ngmin = require('gulp-ngmin');
var htmlmin = require('gulp-htmlmin');
var rev = require('gulp-rev');
var inject = require('gulp-inject');
var mocha = require('gulp-mocha');
var gettext = require('gulp-angular-gettext');
var open = require('open');
var path = require('path');
var fork = require('child_process').fork;
var path = require('path');
var _ = require('lodash');

// add Kibana's grunt tasks
// blocked on https://github.com/gratimax/gulp-grunt/issues/3
// for now you'll have to manually build Kibana
//require('gulp-grunt')(gulp, {
//  base: __dirname + '/kibana',
//  prefix: 'kibana-'
//});

// TODO use gulp-changed

// TODO get livereload working with https://github.com/mollerse/gulp-embedlr

var paths = {
  scripts: 'public/scripts/**/*.js',
  scriptMain: 'public/scripts/app.js',
  styles: 'public/styles/**/*.less',
  svgs: 'public/images/**/*.svg',
  html: 'views/**/*.html',
  partials: 'public/partials/**/*.html',
  indexHtml: 'views/index.html',
  serverTests: 'test/server/**/test-*.js',
  clientTests: 'test/client/**/test-*.js',
  imagesDest: 'dist/public/images',
  bowerComponents: path.normalize(__dirname + '/public/bower_components'),
  copiedFonts: 'public/fonts/bootstrap'
};

var fontExtensions = ['.eot', '.svg', '.ttf', '.woff'];

var autoprefix = function () {
  return autoprefixer('last 2 version', 'safari 5', 'ie 8', 'ie 9', 'opera 12.1', 'ios 6', 'android 4');
};

// build CSS for production
gulp.task('styles', ['clean-styles'], function () {
  // need to depend on clean-styles b/c inject will add all CSS files in dist/styles (including any old ones)
  return gulp.src(paths.styles)
    .pipe(less({
      paths: [paths.bowerComponents]
    }))
    .pipe(autoprefix())
    .pipe(minifycss())
    .pipe(rev())
    .pipe(gulp.dest('dist/public/styles'));
});

gulp.task('clean-styles', function () {
  return gulp.src('dist/public/styles', {read: false})
    .pipe(rimraf());
});

// Copy Bootstap's fonts to public/fonts
gulp.task('bootstrap-fonts', function () {
  var fontPaths = fontExtensions.map(function (ext) {
    return 'public/bower_components/bootstrap/fonts/**/*' + ext;
  });

  return gulp.src(fontPaths)
    .pipe(gulp.dest('public/fonts/bootstrap'));
});

gulp.task('fonts', ['bootstrap-fonts'], function () {
  return gulp.src(fontExtensions.map(function (ext) {
      return 'public/fonts/**/*' + ext;
    }))
    .pipe(gulp.dest('dist/public/fonts'));
});

gulp.task('jshint', function () {
  return gulp.src(paths.scripts)
    .pipe(jshint())
    .pipe(jshint.reporter('jshint-stylish'))
    .pipe(jshint.reporter('fail'));
});

// If we ever need to split up our browserify bundles, here are some useful links:
// https://github.com/domenic/browserify-deoptimizer
// http://benclinkinbeard.com/posts/external-bundles-for-faster-browserify-builds/
// http://esa-matti.suuronen.org/blog/2013/04/15/asynchronous-module-loading-with-browserify/

gulp.task('scripts', ['jshint'], function () {
  return gulp.src(paths.scriptMain)
    .pipe(browserify({
      debug: false // we use browserify-middleware in development
    }))
    .pipe(ngmin())
    .pipe(uglify({
      preserveComments: 'some' // preserve license headers
    }))
    .pipe(rev())
    .pipe(gulp.dest('dist/public/scripts'));
});

gulp.task('clean-scripts', function () {
  return gulp.src('dist/public/scripts', {read: false})
    .pipe(rimraf());
});

var imageminTransform = function () {
  return imagemin({
    optimizationLevel: 3,
    progressive: true,
    interlaced: true
  });
};

// Minifying JPGs, PNGs, and GIFs requires native libs which can be annoying to install on Windows, so
// they're all optional dependencies (see https://github.com/kevva/image-min). If the package isn't installed,
// we don't do the minification.

gulp.task('jpgs', function () {
  var pipeline = gulp.src(['public/images/**/*.jpg', 'public/images/**/*.jpeg']);

  // jpegtran-bin can be annoying on Windows, so make it optional
  var canJpeg = (function () {
    try {
      require.resolve('jpegtran-bin');
      return true;
    } catch (e) {
      return false;
    }
  })();
  if (canJpeg) {
    pipeline = pipeline.pipe(imageminTransform());
  } else {
    console.warn('jpegtran-bin not installed. Not minifying jpgs');
  }

  return pipeline.pipe(gulp.dest(paths.imagesDest));
});

gulp.task('pngs', function () {
  var pipeline = gulp.src(['public/images/**/*.png']);
  var canPng = (function () {
    try {
      require.resolve('pngquant-bin');
      return true;
    } catch (e) {
      return false;
    }
  })();
  if (canPng) {
    pipeline = pipeline.pipe(imageminTransform());
  } else {
    console.warn('pngquant-bin not installed. Not minifying pngs');
  }

  return pipeline.pipe(gulp.dest(paths.imagesDest));
});

gulp.task('gifs', function () {
  var pipeline = gulp.src(['public/images/**/*.gif']);
  var canPng = (function () {
    try {
      require.resolve('gifsicle');
      return true;
    } catch (e) {
      return false;
    }
  })();
  if (canPng) {
    pipeline = pipeline.pipe(imageminTransform());
  } else {
    console.warn('gifsicle not installed. Not minifying gifs');
  }

  return pipeline.pipe(gulp.dest(paths.imagesDest));
});

gulp.task('svgs', function () {
  return gulp.src(paths.svgs)
    .pipe(svgmin())
    .pipe(gulp.dest('dist/public/images'));
});

gulp.task('images', ['jpgs', 'pngs', 'gifs', 'svgs']);

gulp.task('partials', function () {
  return gulp.src(paths.partials)
    .pipe(htmlmin({
      collapseWhitespace: true,
      collapseBooleanAttributes: true,
      removeComments: true,
      removeAttributeQuotes: false,
      removeRedundantAttributes: true,
      removeEmptyAttributes: true,
      removeOptionalTags: false // removing is probably a bad idea with partial docs
    }))
    .pipe(gulp.dest('dist/public/partials'));
});

// Although we do a lot of processing in middleware, this task is still useful to replace references to resources
// with references to revved versions.
gulp.task('inject', ['styles', 'scripts'], function () {
  // TODO clean up when https://github.com/klei/gulp-inject/issues/9 is resolved
  return gulp.src(['dist/public/scripts/**/*.js', 'dist/public/styles/**/*.css'], {read: false})
    .pipe(inject(paths.indexHtml, {
      ignorePath: '/dist'
    }))
    .pipe(gulp.dest('dist/views'));
});

gulp.task('html', ['inject'], function () {
  return gulp.src(['views/**/*.html', '!' + paths.indexHtml, 'dist/views/**/*.html'])
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

//gulp.task('watch', function () {
//  // TODO get this working when manually rebuilding gets annoying enough
//});

gulp.task('pot', function () {
  gulp.src([paths.partials, paths.scripts])
    .pipe(gettext.extract('fracas.pot', {
      postProcess: function (po) {
        po.items.forEach(function (item) {
          item.references = item.references.map(function (ref) {
            return path.relative(path.join(__dirname, 'po'), ref)
              .replace(/\\/g, '/'); // replace any Windows-style paths
          });
        });
      }
    }))
    .pipe(gulp.dest('po/'));
});

gulp.task('translations', function () {
  gulp.src('po/*.po')
    .pipe(gettext.compile({
      format: 'json'
    }))
    .pipe(gulp.dest('dist/public/translations/'));
});

gulp.task('clean', function () {
  return gulp.src(['dist', '.tmp', paths.copiedFonts], {read: false})
    .pipe(rimraf());
});

gulp.task('build', ['images', 'fonts', 'partials', 'html', 'pot', 'translations'/*, 'kibana-build'*/]);

gulp.task('server', ['build'], function (callback) {
  var env = _.clone(process.env);
  env.NODE_ENV = 'production';

  var child = fork(__dirname + '/server.js', [], {
    env: env
  });
  child.on('message', function (m) {
    if (m.started) {
      gutil.log('Opening ' + m.url);
      open(m.url);
    }
  });
  child.on('error', callback);
  child.on('exit', function () {
    callback(null);
  });
});

var mochaTransform = lazypipe()
  .pipe(function () {
    return mocha({
      ui: 'bdd',
      reporter: 'nyan'
    });
  });

// if we want integration tests, we can split this into server-unit-tests and server-integration tests
gulp.task('server-tests', function () {
  return gulp.src(paths.serverTests, {read: false})
    .pipe(mochaTransform());
});

// these are unit tests, integration tests would use Karma and/or CasperJS as the test runner
var clientTests = function () {
  return gulp.src(paths.clientTests, {read: false})
    .pipe(mochaTransform());
};

gulp.task('client-tests', function () {
  return clientTests();
});

// run tests in series so output isn't garbage
gulp.task('tests', ['server-tests'], function () {
  gutil.log('Running client-tests...');
  var pipe = clientTests();
  gutil.log('Finished client-tests');
  return pipe;
});

gulp.task('default', ['build']);
