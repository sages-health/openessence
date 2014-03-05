'use strict';

var express = require('express');
var passport = require('passport');
var conf = require('./conf');
var logger = conf.logger;
var auth = require('./auth');
var app = express();

function renderIndex (req, res) {
  res.render('index.html');
}
exports.renderIndex = renderIndex;

// single page, even login view is handled by client
app.get('/', renderIndex);

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

// /login needs to be routed on client
app.get('/login', renderIndex);

// all routes below this require authenticating
app.all('*', auth.denyAnonymousAccess);

app.delete('/session', function (req, res) {
  res.redirect(307, '/session/browserid');
});

app.delete('/session/browserid', function (req, res) {
  logger.info('%s logged out', req.user.email);
  req.logout();
  res.send(204); // No Content
});

// don't need http-bearer routes because there's no session to setup or teardown

// no need for app.use(app.router);
exports.router = app.router;

// This makes sure ALL other requests go to client for routing. If we really need 404, client can initiate.
// This is the easiest way to handle HTML5 client-side routing. If we want to get fancy, we can parse client-side
// routes from a shared file.
exports.clientRoutes = (function () {
  var app = express();
  app.get('/*', renderIndex);
  return app.router;
})();
