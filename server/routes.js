'use strict';

var express = require('express');
var passport = require('passport');
var conf = require('./conf');
var logger = conf.logger;
var accessControl = require('./accessControl');
var app = express();

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

// no need for app.use(app.router);

module.exports = app.router;
