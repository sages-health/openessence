'use strict';

var url = require('url');
var helmet = require('helmet');
var locale = require('locale');
var useragent = require('useragent');
var express = require('express');

var conf = require('./conf');
var logger = conf.logger;
var assets = require('./assets');
var auth = require('./auth');

var app = require('express')();
var https = url.parse(conf.url).protocol === 'https:';

var views = require('./views');
app.set('views', views.directory);
app.engine('html', views.engine);

// Times out requests after 30 seconds. This is more conservative than the default of 5s b/c we're not as concerned
// about availability for other users, since we're not going to have a lot of concurrent users.
// This middleware should be early in the middleware chain to start the timer as soon as possible.
app.use(require('connect-timeout')(30000));

// gzip responses
app.use(require('compression')());

// Redirect to HTTPS if we're not terminating TLS in a reverse proxy. It's important that this middleware runs early
if (https) {
  app.use(function (req, res, next) {
    if (req.secure || (conf.proxy.enabled && req.get('X-Forwarded-Proto') === 'https')) {
      next();
    } else {
      res.redirect(307, conf.url + req.originalUrl);
    }
  });
}

// favicon
app.use((function () {
  var favicon = require('static-favicon');
  if (conf.env === 'development') {
    return favicon('public/images/favicon.ico');
  } else {
    return favicon('dist/public/images/favicon.ico');
  }
})());

// log requests
if (conf.env === 'production') {
  app.use(require('morgan')());
}

app.use(require('body-parser')()); // parse JSON + URL encoded request bodies, must be before a lot of other middleware
app.use(require('cookie-parser')()); // must be before session
app.use((function () {
  var session = require('express-session');
  var store = null;

  if (conf.session.store === 'redis') {
    logger.info('Using Redis session store');
    var RedisStore = require('connect-redis')(session);
    store = new RedisStore({
      url: conf.redis.url
    });
  }

  return session({
    store: store,
    secret: conf.session.secret,
    proxy: conf.proxy.enabled,
    cookie: {
      path: '/',
      httpOnly: true,
      maxAge: null, // cookie (and thus session) destroyed when user closes browser
      secure: https
    }
  });
})());
app.use(require('connect-flash')());

app.use(helmet.xframe('deny')); // change this if you want to embed Fracas in an iframe
if (https) {
  app.use(helmet.hsts());
}
app.use(helmet.iexss()); // XSS protection for IE
app.use(helmet.ienoopen()); // force users to save downloads in IE instead of open them, we might want to turn this off
app.use(helmet.contentTypeOptions()); // X-Content-Type-Options: nosniff

// Content Security Policy headers
app.use(function (req, res, next) {

  // CSP breaks IE10 (and IE < 10 doesn't support CSP anyway). Not worth the headache.
  if (useragent.lookup(req.headers['user-agent']).family === 'IE') {
    return next();
  }

  // Kibana uses inline scripts and doesn't have ngCsp enabled
  if (/^\/kibana(\/|$)/.test(req.path)) {
    return next();
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

app.use(locale(require('./locale').supportedLocales)); // adds req.locale based on best matching locale
app.get('/', function (req, res) {
  res.redirect(307, '/' + req.locale);
});

app.use(assets.anonymous());
app.use(auth.passport.initialize());
app.use(auth.passport.session());

app.use(require('./locale').middleware);
app.use('/session', require('./session'));

// proxy elasticsearch for Kibana (disabled by default)
var esProxy = require('./es/proxy');
app.use('/es', express()
  .use(auth.denyAnonymousAccess)
  .use(esProxy));

app.use('/kibana', express()
  .use(assets.kibana()))
  .use('/es', express()
    .use(auth.denyAnonymousAccess)
    .use(esProxy));

app.use('/resources', express()
  .use(auth.denyAnonymousAccess)
  .use(require('./resources')()));

app.use('/reports', express()
  .use(auth.denyAnonymousAccess)
  .use(require('./reports')()));

app.use(require('./error').middleware);

module.exports = express()
  .use(app)
  .use('/api', express().use(auth.bearer).use(app)) // TODO test this
  .use(require('./error').notFound); // this must be the last route
