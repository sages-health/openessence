'use strict';

var express = require('express');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var PersonaStrategy = require('passport-persona').Strategy;
var _ = require('lodash');

var conf = require('./server/conf');
var logger = conf.logger;
var assets = require('./server/assets');
var accessControl = require('./server/accessControl');

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
  secret: conf.settings.SESSION_SECRET,
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
  next();
});

app.use(app.router);

app.use(require('./server/error').middleware);

app.engine('html', function (path, options, callback) {
  options = _.assign({
    open: '{{', // htmlmin likes to escape <
    close: '}}'
  }, options);
  require('ejs').renderFile(path, options, callback);
});
app.set('views', require('./server/views')(conf.env));


app.get('/', function (req, res) {
  // single page, even login view is handled by client
  res.render('index.html');
});

app.post('/session', function (req, res) {
  // 307 means client should send another POST
  res.redirect(307, '/session/browserid');
});

app.post('/session/browserid', function (req, res, next) {
  passport.authenticate('persona', function (err, user) {
    if (err) {
      next(err);
      return;
    }

    if (user) {
      req.login(user, function (err) {
        if (err) {
          next(err);
          return;
        }

        res.json(200, {
          // whitelist user properties that are OK to send to client
          email: user.email
        });
      });
    } else {
      res.json(401, {
        message: 'Bad credentials'
      });
    }
  })(req, res, next);
});

// all routes below this require authenticating
app.all('*', accessControl.denyAnonymousAccess);

app.delete('/session', function (req, res) {
  res.redirect(307, '/session/browserid');
});

app.delete('/session/browserid', function (req, res) {
  logger.info('%s logged out', req.user.email);
  req.logout();
  res.send(204); // No Content
});

var esProxy = require('./server/es/proxy');
app.use('/es', esProxy);
app.use('/kibana/es', esProxy);
app.use('/kibana', assets.kibana());

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
