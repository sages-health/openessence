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
  app.use(require('morgan')('combined'));
} else {
  app.use(require('morgan')('dev'));
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

// Hide X-Powered-By
app.use(helmet.hidePoweredBy({setTo: 'OpenEssence'}));

// Set X-Frame: DENY to prevent clickjacking.
// Change this if you want to embed Fracas in an iframe
app.use(helmet.frameguard('deny'));

if (https) {
  app.use(helmet.hsts());
}
app.use(helmet.xssFilter()); // XSS protection for IE
app.use(helmet.ieNoOpen()); // force users to save downloads in IE instead of open them, we might want to turn this off
app.use(helmet.noSniff()); // X-Content-Type-Options: nosniff

// Content Security Policy headers
app.use(function (req, res, next) {
  /*jshint quotmark:false */

  var ua = useragent.lookup(req.headers['user-agent']);

  // CSP breaks IE10 (and IE < 10 doesn't support CSP anyway). Not worth the headache.
  if (ua.family === 'IE') {
    return next();
  } else if (ua.family === 'PhantomJS') {
    // see https://github.com/ariya/phantomjs/issues/11337
    return next();
  }

  var self = "'self'";
  var none = "'none'";

  helmet.contentSecurityPolicy({
    'default-src': [self],
    'script-src': [self, 'https://login.persona.org'],
    // way too many things use inline styles (ngAnimate, ng-ui-bootstrap, ...)
    'style-src': [self, "'unsafe-inline'"],
    'img-src': [self, 'data:', 'https://otile1-s.mqcdn.com', 'https://otile2-s.mqcdn.com', 'https://otile3-s.mqcdn.com',
                'https://otile4-s.mqcdn.com', 'https://developer.mapquest.com/content/osm/mq_logo.png'],
    'frame-src': ['https://login.persona.org'],
    'object-src': [none] // I really hope we never need Flash or any other plugins
  })(req, res, next);
});

// CSRF tokens
app.use(function (req, res, next) {
  // Test if request starts with /api/ using regex (best performance)
  if (/^\/api\//.test(req.path)) {
    next(); // Don't use CSRF if its /api/
  }
  else {
    require('csurf')()(req, res, next);
  }
});

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
  if (reqAuth && reqAuth.indexOf('Bearer ') === 0) {
    auth.bearer(req, res, next);
  } else {
    next();
  }
});

app.use(require('./locale').middleware);
app.use('/session', require('./session'));

app.use('/resources', express()
  .use(auth.denyAnonymousAccess)
  .use(require('./resources')()));

app.use('/reports', express()
  .use(auth.denyAnonymousAccess)
  .use(require('./reports')()));

app.use('/detectors', express()
  .use(auth.denyAnonymousAccess)
  .use(require('./detectors')()));

app.use('/csv', express()
  .use(auth.denyAnonymousAccess)
  .use(require('./csv/export')()));

app.use('/api', express()
  .use(auth.bearer)
  .use(require('./resources')()));

app.use(require('./error').middleware);

module.exports = express()
  .use(app)
  .use(require('./error').notFound); // this must be the last route
