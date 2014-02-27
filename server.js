'use strict';

var express = require('express');
var passport = require('passport');
var PersonaStrategy = require('passport-persona').Strategy;
var locale = require('locale');
var _ = require('lodash');

var conf = require('./server/conf');
var logger = conf.logger;
var accessControl = require('./server/accessControl');
var assets = require('./server/assets');
var supportedLocales = require('./server/locales').getSupportedLocalesSync();
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
    next();
  }
});

app.use(assets.anonymous());

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function (user, done) {
  // store entire user object in session so we don't have to deserialize it from data store
  // this won't scale to large number of concurrent users, but it will be faster for small deployments
  done(null, user);
});
passport.deserializeUser(function (user, done) {
  // no need to deserialize, we store entire user in memory
  done(null, user);
});

passport.use(new PersonaStrategy({
  audience: 'http://localhost:9000'
}, function (email, done) {
  // TODO whitelist emails here
  logger.info('%s logged in', email);
  return done(null, {
    email: email
    // other attributes can come from DB
  });
}));

// variables for views, this must be before router in the middleware chain
app.use(function (req, res, next) {
  res.locals.user = req.user;
  if (req.csrfToken) { // not every request has CSRF token
    res.locals.csrfToken = req.csrfToken();
  }
  res.locals.lang = req.locale;
  next();
});

// /en/*, /es/*, etc.
supportedLocales.forEach(function (l) {
  app.use('/' + l, routes);
});

// also allow requests unprefixed by locale
app.use(routes);

// everything below this requires authentication
app.use(accessControl.denyAnonymousAccess);

var esProxy = require('./server/es/proxy');
app.use('/es', esProxy);
app.use('/kibana/es', esProxy);
app.use('/kibana', assets.kibana());

app.use(require('./server/error').middleware);

app.engine('html', function (path, options, callback) {
  options = _.assign({
    open: '{{', // htmlmin likes to escape <
    close: '}}'
  }, options);
  require('ejs').renderFile(path, options, callback);
});
app.set('views', require('./server/views')(conf.env));

// this MUST be the last route
app.use(require('./server/error').notFound);

if (!module.parent) {
  logger.info('Running in %s mode', conf.env);

  var port = process.env.PORT || 9000;

  app.listen(port, function () {
    // must log to stdout (some 3rd party tools read stdout to know when web server is up)
    console.log('Listening on port ' + port);

    // if we have a parent, tell them we started
    if (process.send) {
      process.send({
        started: true,
        url: 'http://localhost:' + port
      });
    }
  });
}
