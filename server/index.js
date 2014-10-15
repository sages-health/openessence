'use strict';

var url = require('url');
var helmet = require('helmet');
var locale = require('locale');
var useragent = require('useragent');
var express = require('express');
var bodyParser = require('body-parser');

var conf = require('./conf');
var logger = conf.logger;
var assets = require('./assets');
var auth = require('./auth');

var app = express();
var https = url.parse(conf.url).protocol === 'https:';

var views = require('./views');
app.set('views', views.directory);
app.engine('html', views.engine);

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
  var favicon = require('serve-favicon');
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

app.use(assets.static());

app.use(bodyParser.json());
//app.use(bodyParser.urlencoded({extended: true})); // we only use JSON-encoded request bodies

app.use(require('cookie-parser')()); // must be before session
app.use((function () {
  var session = require('express-session');
  var store = null;

  if (conf.session.store === 'redis') {
    logger.info('Using Redis session store');
    var RedisStore = require('connect-redis')(session); // conditionally require since it's an optional dependency
    store = new RedisStore({
      client: conf.redis.client
    });
  }

  return session({
    store: store,
    secret: conf.session.secret,
    proxy: conf.proxy.enabled,
    rolling: true, // each request resets the session expiration clock
    resave: true,
    saveUninitialized: true, // Guest sessions are the easiest way to have CSRF token for login
    cookie: {
      path: '/',
      httpOnly: true,
      maxAge: 86400000, // session expires after 1 day idle
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

  var self = '\'self\'';
  var none = '\'none\'';

  helmet.csp({
    'default-src': [self],
    'script-src': [self, 'https://login.persona.org'],
    // way too many things use inline styles (ngAnimate, ng-ui-bootstrap, ...)
    'style-src': [self, 'fonts.googleapis.com', '\'unsafe-inline\''],
    'img-src': [self, 'data:', 'https://otile1-s.mqcdn.com', 'https://otile2-s.mqcdn.com', 'https://otile3-s.mqcdn.com',
                'https://otile4-s.mqcdn.com', 'https://developer.mapquest.com/content/osm/mq_logo.png'],
    'font-src': [self, 'themes.googleusercontent.com'],
    'frame-src': ['https://login.persona.org'],
    'media-src': [self], // someday we might use <audio> and/or <video>
    'object-src': [none] // I really hope we never need Flash or any other plugins
  })(req, res, next);
});

app.use(require('csurf')());

app.use(locale(require('./locale').supportedLocales)); // adds req.locale based on best matching locale
app.get('/', function (req, res) {
  res.redirect(307, '/' + req.locale);
});

app.use(auth.passport.initialize());
app.use(auth.passport.session());

app.use(function (req, res, next) {
  //req check for bearer authorization
  //grab token, look up user, set user
  var reqAuth = req.get('Authorization');
  if (reqAuth && reqAuth.indexOf('Bearer ') === 0 ) {
    auth.bearer(req, res, next);
  } else {
    next();
  }
//  var User = require('./models/User');
//  req.user = new User({name: 'admin', username: 'admin', roles: ['admin'], 'tokens': ['tokenABC']});

})

app.use(require('./locale').middleware);
app.use('/session', require('./session'));

// TODO rename /api and include version in URL
app.use('/resources', express()
//  .use(auth.denyAnonymousAccess)
  .use(require('./resources')()));

app.use('/reports', express()
//  .use(auth.denyAnonymousAccess)
  .use(require('./reports')()));

app.use(require('./error').middleware);

module.exports = express()
  .use(app)
  .use('/api', express().use(auth.bearer).use(app)) // TODO test this
  .use(require('./error').notFound); // this must be the last route
