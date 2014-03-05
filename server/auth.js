'use strict';

var passport = require('passport');
var PersonaStrategy = require('passport-persona').Strategy;
var BearerStrategy = require('passport-http-bearer').Strategy; // for API clients

var conf = require('./conf');
var logger = conf.logger;

passport.serializeUser(function (user, done) {
  // store entire user object in session so we don't have to deserialize it from data store
  // this won't scale to large number of concurrent users, but it will be faster for small deployments
  done(null, user);
});
passport.deserializeUser(function (user, done) {
  // no need to deserialize, we store entire user in memory
  done(null, user);
});

var token = 'eachUserShouldHaveAnAuthTokenForAPIRequestsOnTheirBehalfE.g.SavingPagesWithPhantomJS';

passport.use(new PersonaStrategy({
  audience: 'http://localhost:9000'
}, function (email, done) {
  // TODO whitelist emails here
  logger.info('%s logged in', email);
  return done(null, {
    id: 123456789,
    email: email,
    token: token
    // other attributes can come from DB
  });
}));

// TODO get this from data-thing/elasticsearch
var users = {};
users[token] = {
  id: 999999,
  username: 'Gabe',
  email: 'gabe@localhost'
};

passport.use(new BearerStrategy({}, function (token, done) {
  var user = users[token];
  if (!user) {
    done(null, false);
    return;
  }

  done(null, user);
}));

function accessDeniedHandler (req, res) {
  logger.info({req: req}, 'Blocked unauthorized request to ' + req.url); // bunyan FTW!
  var action = 'access ' + req.originalUrl;

  res.status(403);
  res.format({
    html: function () {
      res.render('403.html', {
        action: action
      });
    },
    json: function () {
      res.send({
        error: 'Access denied: you don\'t have permission to ' + action
      });
    }
  });
}

function denyAnonymousAccess (req, res, next) {
  if (!req.user) {
    accessDeniedHandler(req, res);
  } else {
    next();
  }
}

module.exports = {
  passport: passport,
  accessDeniedHandler: accessDeniedHandler,
  denyAnonymousAccess: denyAnonymousAccess
};
