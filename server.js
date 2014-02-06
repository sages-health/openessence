'use strict';

var express = require('express');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;

var conf = require('./server/conf');
var logger = conf.logger;
var staticResources = require('./server/staticResources');
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
    maxAge: null,
    secure: conf.env === 'production' // force HTTPS
  }
}));
app.use(require('connect-flash')());

app.use(staticResources.anonymousResources(conf.env, express));

app.use(passport.initialize());
app.use(passport.session());

app.use(app.router);

app.use(require('./server/error').middleware);

app.engine('html', require('ejs').renderFile);
app.set('views', require('./server/views')(conf.env));

// see http://redotheweb.com/2013/02/20/sequelize-the-javascript-orm-in-practice.html
var models = require('./server/models');
app.set('models', models);

passport.serializeUser(function (user, done) {
  // store entire user object in session so we don't have to deserialize it from data store
  // this won't scale to large number of concurrent users, but it will be faster for small deployments
  done(null, user);
});
passport.deserializeUser(function (user, done) {
  done(null, user);
});

passport.use(new LocalStrategy(function (username, password, done) {
  models.User
    .find({
      where: {
        name: username
      }
    })
    .error(done)
    .success(function (user) {
      if (!user) {
        return done(null, false, {
          // don't display this to the user, that would be an info leak
          message: 'Unknown username ' + username
        });
      }
      user.comparePassword(password, function (err, result) {
        if (err) {
          return done(err);
        }
        if (result) {
          return done(null, user);
        } else {
          return done(null, false, {
            message: 'Incorrect password'
          });
        }
      });
    });
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
app.use('/kibana', staticResources.kibana(conf.env, express));

// this MUST be the last route
app.use(require('./server/error').notFound);

if (!module.parent) {
  var port = process.env.PORT || 9000;

  app.listen(port, function () {
    // must log to stdout (some 3rd party tools read stdout to know when web server is up)
    console.log('Listening on port ' + port);
  });
}
