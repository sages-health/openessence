'use strict';

var express = require('express');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var _ = require('lodash');

var conf = require('./server/conf');
var logger = conf.logger;
var assets = require('./server/assets');
var accessControl = require('./server/accessControl');

var app = express();

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

app.use(assets.anonymous());

app.use(passport.initialize());
app.use(passport.session());

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

passport.serializeUser(function (user, done) {
  // store entire user object in session so we don't have to deserialize it from data store
  // this won't scale to large number of concurrent users, but it will be faster for small deployments
  done(null, user);
});
passport.deserializeUser(function (user, done) {
  done(null, user);
});

passport.use(new LocalStrategy(function (username, password, done) {
  return done(null, {
    id: 1,
    name: 'admin'
  }); // TODO get from es
}));

app.get('/', function (req, res) {
  // single page, even login view is handled by client
  res.render('index.html', {user: req.user});
});

app.post('/login', passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/',
  failureFlash: true
}));

// all routes below this require authenticating
app.all('*', accessControl.denyAnonymousAccess);

app.use('/es', require('./server/es/proxy'));
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
