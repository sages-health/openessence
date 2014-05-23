'use strict';

var gulp = require('gulp');
var gutil  = require('gulp-util');
var lazypipe = require('lazypipe');
var uglify = require('gulp-uglify');
var htmlmin = require('gulp-htmlmin');
var rev = require('gulp-rev');
var mocha = require('gulp-mocha');
var gettext = require('gulp-angular-gettext');
var buffer = require('gulp-buffer');
var browserify = require('browserify');
var karma = require('karma');
var path = require('path');

var _ = require('lodash');
var source = require('vinyl-source-stream');
var transformTools = require('browserify-transform-tools');
var jsLibs = require('./server/assets').libs();

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
  styles: ['public/styles/main.less'], // other styles are loaded from main
  partials: ['public/**/*.html', notBowerComponents],
  html: 'views/**/*.html',
  indexHtml: 'views/index.html',
  serverTests: 'test/server/**/test-*.js',
  clientTests: 'test/client/**/test-*.js',
  imagesDest: 'dist/public/images',
  bowerComponents: 'public/bower_components',
  nodeModules: 'node_modules'
};

var fontExtensions = ['.eot', '.svg', '.ttf', '.woff'];

// build CSS for production
gulp.task('styles', function () {
  var less = require('gulp-less');
  var autoprefixer = require('gulp-autoprefixer');
  var minifycss = require('gulp-minify-css');

  return gulp.src(paths.styles)
    .pipe(less({
      paths: [paths.bowerComponents, paths.nodeModules]
    }))
    .pipe(autoprefixer('last 2 version', 'safari 5', 'ie 8', 'ie 9', 'opera 12.1', 'ios 6', 'android 4'))
    .pipe(minifycss())
    .pipe(rev())
    .pipe(gulp.dest('dist/public/styles'));
});

gulp.task('fonts', function () {
  return gulp.src(fontExtensions.map(function (ext) {
      return 'public/fonts/**/*' + ext;
    }))
    .pipe(gulp.dest('dist/public/fonts'));
});

gulp.task('jshint', function () {
  var jshint = require('gulp-jshint');

  return gulp.src(paths.scripts)
    .pipe(jshint())
    .pipe(jshint.reporter('jshint-stylish'))
    .pipe(jshint.reporter('fail'));
});

// minifies partials and converts them to a JS string that can be `require`d
gulp.task('partials', function () {
  var replace = require('gulp-replace');
  var header = require('gulp-header');
  var footer = require('gulp-footer');

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

/**
 * Task to build 3rd-party JavaScript libraries.
 */
gulp.task('libs', function () {
  var bundle = browserify();
  jsLibs.forEach(function (lib) {
    bundle.require(lib);
  });

  return bundle
    .bundle()
    .pipe(source('libs.js'))
    .pipe(buffer())// gulp-rev doesn't like streams, so convert to buffer
    .pipe(uglify({
      preserveComments: 'some' // preserve license headers
    }))
    .pipe(rev())
    .pipe(gulp.dest('dist/public/scripts/'));
});

gulp.task('scripts', ['jshint', 'partials', 'libs'], function () {
  var ngmin = require('gulp-ngmin');

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

  var appBundle = browserify()
    .add(__dirname + '/public/scripts/app.js')
    .transform(minifyPartials);

  jsLibs.forEach(function (lib) {
    appBundle.external(lib);
  });

  return appBundle
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

var imageminTransform = function () {
  var imagemin = require('gulp-imagemin');

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
  var svgmin = require('gulp-svgmin');

  return gulp.src('public/images/**/*.svg')
    .pipe(svgmin())
    .pipe(gulp.dest('dist/public/images'));
});

gulp.task('images', ['jpgs', 'pngs', 'gifs', 'svgs'], function () {
  return gulp.src('public/images/*.ico')
    .pipe(gulp.dest('dist/public/images'));
});

// Although we do a lot of processing in middleware, this task is still useful to replace references to resources
// with references to revved versions.
gulp.task('inject', ['styles', 'scripts'], function () {
  var inject = require('gulp-inject');
  var fs = require('fs');
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

  return gulp.src(paths.indexHtml)
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
  // recommended over gulp-clean, see https://github.com/peter-vilja/gulp-clean/pull/3
  var rimraf = require('gulp-rimraf');

  return gulp.src(['dist', '.tmp'], {read: false})
    .pipe(rimraf());
});

gulp.task('build', ['images', 'fonts', 'html', 'translations']);

gulp.task('server', ['build'], function (callback) {
  var fork = require('child_process').fork;
  var open = require('open');
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

gulp.task('migrations', function (done) {
  var importData = require('./server/codex/import');
  var strategy = require('./server/codex/import/db');
  importData(strategy, done);
});

gulp.task('heroku', ['build']);

gulp.task('default', ['build']);
