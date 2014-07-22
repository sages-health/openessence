'use strict';

var express = require('express');
var auth = require('./auth');
var conf = require('./conf');
var logger = conf.logger;

var app = express();

app.use(require('body-parser').json());

app.post('/', function (req, res) {
  // 307 means client should send another POST
  res.redirect(307, '/session/browserid');
});

app.post('/browserid', auth.persona);
app.post('/local', auth.local);

var logout = function (req, res) {
  logger.info({user: req.user}, 'Logging %s out', req.user.doc.username);
  req.logout();
  res.send(204); // No Content
};

app.delete('/', auth.denyAnonymousAccess, logout); // VERB middleware is the one place where multiple callbacks are OK

// Extra endpoints for symmetry with POST. Note that it doesn't actually matter which endpoint you use since they
// both use the same session store and the session ID is sent via cookie.
app.delete('/browserid', auth.denyAnonymousAccess, logout);
app.delete('/local', auth.denyAnonymousAccess, logout);

app.use(require('./error').middleware); // so this app can be tested in isolation

module.exports = app;
