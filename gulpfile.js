'use strict';

// see http://markgoodyear.com/2014/01/getting-started-with-gulp/
var gulp = require('gulp');
var gutil  = require('gulp-util');
var lazypipe = require('lazypipe');
var less = require('gulp-less');
var autoprefixer = require('gulp-autoprefixer');
var minifycss = require('gulp-minify-css');
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
var buffer = require('gulp-buffer');
var replace = require('gulp-replace');
var header = require('gulp-header');
var footer = require('gulp-footer');
var browserify = require('browserify');
var karma = require('karma');
var open = require('open');
var path = require('path');
var fork = require('child_process').fork;
var _ = require('lodash');
var source = require('vinyl-source-stream');
var transformTools = require('browserify-transform-tools');

// add Kibana's grunt tasks
// blocked on https://github.com/gratimax/gulp-grunt/issues/3
// for now you'll have to manually build Kibana
//require('gulp-grunt')(gulp, {
//  base: __dirname + '/kibana',
//  prefix: 'kibana-'
//});

// TODO use gulp-changed

// TODO get livereload working with https://github.com/mollerse/gulp-embedlr

var notBowerComponents = '!public/bower_components/**/*';

var paths = {
  scripts: ['public/**/*.js', notBowerComponents],
  styles: ['public/**/*.less', notBowerComponents],
  svgs: ['public/**/*.svg', notBowerComponents],
  partials: ['public/**/*.html', notBowerComponents],
  html: 'views/**/*.html',
  indexHtml: 'views/index.html',
  serverTests: 'test/server/**/test-*.js',
  clientTests: 'test/client/**/test-*.js',
  imagesDest: 'dist/public/images',
  bowerComponents: 'public/bower_components',
  nodeModules: 'node_modules',
  copiedFonts: 'public/fonts/bootstrap'
};

var fontExtensions = ['.eot', '.svg', '.ttf', '.woff'];

// build CSS for production
gulp.task('styles', ['clean-styles'], function () {
  // need to depend on clean-styles b/c inject will add all CSS files in dist/styles (including any old ones)
  return gulp.src(paths.styles)
    .pipe(less({
      paths: [paths.bowerComponents, paths.nodeModules]
    }))
    .pipe(autoprefixer('last 2 version', 'safari 5', 'ie 8', 'ie 9', 'opera 12.1', 'ios 6', 'android 4'))
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

// minifies partials and converts them to a JS string that can be `require`d
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
    // inspired by https://github.com/visionmedia/node-string-to-js/blob/master/index.js
    .pipe(replace(/"/g, '\\"'))
    .pipe(replace(/\r\n|\r|\n/g, '\\n'))

    // wrap HTML in module
    .pipe(header('module.exports = "'))
    .pipe(footer('";'))

    .pipe(gulp.dest('.tmp/public/')); // write to .tmp so they can be read by browserify
});

gulp.task('scripts', ['clean-scripts', 'jshint', 'partials'], function () {
  // transform that replaces references to `require`d partials with their minified versions in .tmp,
  // e.g. a call to require('../partials/foo.html') in public/scripts would be replaced by
  // require('../../.tmp/public/partials/foo.html')
  var minifyPartials = transformTools.makeRequireTransform('partialTransform',
    {evaluateArguments: true},
    function (args, opts, cb) {
      var file = args[0];
      if (path.extname(file) !== '.html') {
        cb();
        return;
      }

      var referrerDir = path.dirname(opts.file); // directory of file that has the require() call
      var tmp = path.join(__dirname, '.tmp');
      var tmpResource = path.resolve(referrerDir, file).replace(__dirname, tmp); // path to required tmp resource
      var relativePath = path.relative(referrerDir, tmpResource).replace(/\\/g, '/');

      cb(null, 'require("' + relativePath + '")');
    });

  return browserify()
    .add(__dirname + '/public/scripts/app.js')
    .transform(minifyPartials)
    .bundle()
    .pipe(source('app.js')) // convert stream of text to stream of Vinyl objects for gulp
    .pipe(buffer())// ngmin, et al. don't like streams, so convert to buffer
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
  gulp.src(paths.partials.concat(paths.scripts))
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

gulp.task('build', ['images', 'fonts', 'html', 'pot', 'translations'/*, 'kibana-build'*/]);

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

// these are unit tests, integration/e2e tests would use Protractor as the test runner
gulp.task('client-tests', function (cb) {
  // FIXME this doesn't work
  karma.server.start({configFile: __dirname + '/test/client/karma.conf.js'}, function () {
    cb(null);
  });
});

gulp.task('tests', ['server-tests']);

gulp.task('default', ['build']);
