'use strict';

var express = require('express');
var locale = require('locale');
var _ = require('lodash');

var conf = require('./server/conf');
var logger = conf.logger;
var assets = require('./server/assets');
var supportedLocales = require('./server/locales').getSupportedLocalesSync();
var accessControl = require('./server/accessControl');
var routes = require('./server/routes');

var app = express();

app.use(express.compress());
app.use(express.favicon('public/favicon.ico'));
if (conf.env === 'production') {
  app.use(express.logger());
}
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(express.cookieParser());
app.use(express.session({
  secret: conf.sessionSecret,
  cookie: {
    path: '/',
    httpOnly: true,
    maxAge: null
//    secure: conf.env === 'production' // force HTTPS, this should be turned on after development
  }
}));
app.use(require('connect-flash')());

var csrf = express.csrf();
app.use(function (req, res, next) {
  if (req.method === 'POST' && /^\/kibana\/es(\/|$)/.test(req.path)) {
    // Kibana's POST requests to elasticsearch don't need CSRF tokens since they don't mutate state and we don't
    // want to patch Kibana
    next();
  } else {
    csrf(req, res, next);
  }
});

app.use(locale(supportedLocales)); // adds req.locale based on best matching locale
app.use(function (req, res, next) {
  if (req.path === '/') {
    res.redirect(307, '/' + req.locale);
  } else {
    // override user agent's locale, useful for debugging and for multilingual users
    req.locale = req.path.split('/')[1];
    if (req.locale === 'api') {
      // API requests don't have a locale associated with them
      req.locale = 'en';
    }
    next();
  }
});

app.use(assets.anonymous());

var passport = require('./server/auth').passport;
app.use(passport.initialize());
app.use(passport.session());

// variables for views, this must be before router in the middleware chain
app.use(function (req, res, next) {
  res.locals.user = req.user;
  if (req.csrfToken) { // not every request has CSRF token
    res.locals.csrfToken = req.csrfToken();
  }
  res.locals.lang = req.locale;
  res.locals.persona = true;
  res.locals.baseHref = req.protocol + '://' + req.host + ':' + conf.port + '/' + req.locale + '/';

  next();
});

// /en/*, /es/*, etc.
supportedLocales.forEach(function (l) {
  app.use('/' + l, routes.router);

  // You'll never get a 404. This isn't so bad, since these routes
  // are only for user-facing URLs (XHR requests don't use locale prefix) and server-side 404 isn't that useful, as
  // opposed to client-side error message.
  app.use('/' + l, routes.clientRoutes);
});

// also allow XHR requests unprefixed by locale (these do NOT delegate to client routes)
app.use(routes.router);

// ...and API clients with Bearer tokens
var api = require('./server/api');
app.use('/api', api);

// everything below this requires authentication
app.use(accessControl.denyAnonymousAccess);

var esProxy = require('./server/es/proxy');
app.use('/es', esProxy);
app.use('/kibana/es', esProxy);
app.use('/kibana', assets.kibana());

app.use('/reports', require('./server/reports'));

app.use(require('./server/error').middleware);

app.engine('html', function (path, options, callback) {
  options = _.assign({
    open: '{{', // htmlmin likes to escape <
    close: '}}'
  }, options);
  require('ejs').renderFile(path, options, callback);
});
app.set('views', require('./server/views')(conf.env));

// This MUST be the last route. Since we delegate to the client for HTML5-style routes, we'll never reach this point
// for GET requests. But we can handle every other verb.
app.use(require('./server/error').notFound);

if (!module.parent) {
  logger.info('Running in %s mode', conf.env);

  var port = conf.port;

  var fork = require('child_process').fork;
  var phantomChild = fork(__dirname + '/server/phantom');
  var phantom = require('./server/phantom');
  phantomChild.on('message', function (message) {
    if (message.started) {
      phantom.started = true; // TODO promise?
      phantom.childProcess = phantomChild;
    }
  });

  app.listen(port, function () {
    logger.info('Fracas listening on port %s', port);

    // if we have a parent, tell them we started
    if (process.send) {
      process.send({
        started: true,
        url: 'http://localhost:' + port
      });
    }
  });
}
