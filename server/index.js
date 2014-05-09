'use strict';

var helmet = require('helmet');
var locale = require('locale');
var _ = require('lodash');

var conf = require('./conf');
var assets = require('./assets');
var supportedLocales = require('./locales').getSupportedLocalesSync();
var auth = require('./auth');
var routes = require('./routes');

var app = require('express')();

// Times out requests after 30 seconds. This is more conservative than the default of 5s b/c we're not as concerned
// about availability for other users, since we're not going to have a lot of concurrent users.
// This middleware should be early in the middleware chain to start the timer as soon as possible.
app.use(require('connect-timeout')(30000));

// gzip responses
app.use(require('compression')());

// favicon
app.use((function () {
  var favicon = require('static-favicon');
  if (conf.env === 'development') {
    return favicon('public/images/favicon.ico');
  } else {
    return favicon('dist/images/favicon.ico');
  }
})());

// log requests
if (conf.env === 'production') {
  app.use(require('morgan')());
}

app.use(require('body-parser')()); // parse JSON + URL encoded request bodies, must be before a lot of other middleware
app.use(require('cookie-parser')()); // must be before session
app.use(require('express-session')({
  secret: conf.sessionSecret,
  cookie: {
    path: '/',
    httpOnly: true,
    maxAge: null
//    secure: conf.env === 'production' // force HTTPS, this should be turned on after development
  }
}));
app.use(require('connect-flash')());

app.use(helmet.xframe('deny')); // change this if you want to embed Fracas in an iframe
//app.use(helmet.hsts()); // TODO turn this on when we support TLS
app.use(helmet.iexss()); // XSS protection for IE
app.use(helmet.ienoopen()); // force users to save downloads in IE instead of open them, we might want to turn this off
app.use(helmet.contentTypeOptions()); // X-Content-Type-Options: nosniff

app.use(function (req, res, next) {
  if (/^\/kibana(\/|$)/.test(req.path)) {
    // Kibana uses inline scripts and doesn't have ngCsp enabled
    next();
    return;
  }

  var self = '\'self\'';
  var none = '\'none\'';

  helmet.csp({
    'default-src': [self],
    'script-src': [self, 'https://login.persona.org'],
    // way too many things use inline styles (ngAnimate, ng-ui-bootstrap, ...)
    'style-src': [self, 'fonts.googleapis.com', '\'unsafe-inline\''],
    'img-src': [self],
    'font-src': [self, 'themes.googleusercontent.com'],
    'frame-src': ['https://login.persona.org'],
    'media-src': [self], // someday we might use <audio> and/or <video>
    'object-src': [none] // I really hope we never need Flash or any other plugins
  })(req, res, next);
});

// csrf
app.use((function () {
  var csrf = require('csurf')(); // don't call require() in middleware, it could be slow
  return function (req, res, next) {
    if (req.method === 'POST' && /^\/kibana\/es(\/|$)/.test(req.path)) {
      // Kibana's POST requests to elasticsearch don't need CSRF tokens since they don't mutate state and we don't
      // want to patch Kibana
      next();
    } else {
      csrf(req, res, next);
    }
  };
})());

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
app.use(auth.passport.initialize());
app.use(auth.passport.session());

// variables for views, this must be before router in the middleware chain
app.use(function (req, res, next) {
  res.locals.user = req.user;
  if (req.csrfToken) { // not every request has CSRF token
    res.locals.csrfToken = req.csrfToken();
  }
  res.locals.lang = req.locale;
  res.locals.persona = true;
  res.locals.baseHref = req.protocol + '://' + req.host + ':' + conf.port + '/' + req.locale + '/';
  res.locals.environment = conf.env;

  next();
});

// /en/*, /es/*, etc.
supportedLocales.forEach(function (l) {
  app.use('/' + l, routes.server());

  // You'll never get a 404. This isn't so bad, since these routes
  // are only for user-facing URLs (XHR requests don't use locale prefix) and server-side 404 isn't that useful, as
  // opposed to client-side error message.
  app.use('/' + l, routes.client());
});

// also allow XHR requests unprefixed by locale (these do NOT delegate to client routes)
app.use(routes.server());

// ...and API clients with Bearer tokens
app.use('/api', require('./api')());

// everything below this requires authentication
app.use(auth.denyAnonymousAccess);

var esProxy = require('./es/proxy');
app.use('/es', esProxy);
app.use('/kibana/es', esProxy);
app.use('/kibana', assets.kibana());

app.use('/resources', require('./codex')());
app.use('/reports', require('./reports')());

app.use(require('./error').middleware);

app.engine('html', function (path, options, callback) {
  options = _.assign({
    open: '[[', // htmlmin likes to escape <, and {{ is used by Angular
    close: ']]'
  }, options);
  require('ejs').renderFile(path, options, callback);
});
app.set('views', require('./views')(conf.env));

// This MUST be the last route. Since we delegate to the client for HTML5-style routes, we'll never reach this point
// for GET requests. But we can handle every other verb.
app.use(require('./error').notFound);

module.exports = app;
