'use strict';

var express = require('express');
var passport = require('passport');
var conf = require('./conf');
var logger = conf.logger;
var auth = require('./auth');
var errors = require('./error');

function renderIndex (req, res) {
  res.render('index.html');
}
exports.renderIndex = renderIndex;

exports.server = function () {
  var app = express.Router();

  // single page, even login view is handled by client
  app.get('/', renderIndex);

  app.post('/session', function (req, res) {
    // 307 means client should send another POST
    res.redirect(307, '/session/browserid');
  });

  var login = function (err, user, req, res, next) {
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
          username: user.username,
          email: user.email,
          name: user.name,
          roles: user.roles,
          districts: user.districts,
          authType: user.authType
        });
      });
    } else {
      next(new errors.BadCredentialsError());
    }
  };

  app.post('/session/browserid', function (req, res, next) {
    passport.authenticate('persona', function (err, user) {
      login(err, user, req, res, next);
    })(req, res, next);
  });

  app.post('/session/local', function (req, res, next) {
    passport.authenticate('local', function (err, user) {
      login(err, user, req, res, next);
    })(req, res, next);
  });

  // /login needs to be routed on client
  app.get('/login', renderIndex);

  // all routes below this require authenticating
  app.use(auth.denyAnonymousAccess);

  var logout = function (req, res) {
    logger.info({user: req.user}, 'Logging %s out', req.user.username);
    req.logout();
    res.send(204); // No Content
  };

  app.delete('/session', logout);

  // extra end points for symmetry with POST
  app.delete('/session/browserid', logout);
  app.delete('/session/local', logout);

  // don't need http-bearer routes because there's no session to setup or teardown

  return app;
};

// This makes sure ALL other requests go to client for routing. If we really need 404, client can initiate.
// This is the easiest way to handle HTML5 client-side routing. If we want to get fancy, we can parse client-side
// routes from a shared file.
exports.client = function () {
  var app = express.Router();
  app.get('/*', renderIndex);
  return app;
};
