'use strict';

var fs = require('fs');
var path = require('path');
var express = require('express');

var views = require('./views');
var locals = require('./locals');

var poFiles = fs.readdirSync(__dirname + '/../po').filter(function (f) {
  return path.extname(f) === '.po';
});
var locales = poFiles.map(function (f) {
  return path.basename(f, '.po');
});

var app = express();
app.set('views', views.directory); // this isn't always inherited from the parent app
app.engine('html', views.engine);

app.param('locale', function (req, res, next, locale) {
  if (locales.indexOf(locale) === -1) {
    // TODO get rid of /api
    return next('route');
  }

  // URL overrides Accept-Language header
  req.locale = locale;
  next();
});

var renderIndex = function (req, res) {
  res.render('index.html');
};

app.get('/:locale', locals, renderIndex); // VERB middleware is the one place it's OK to have multiple callbacks

// Route to client instead of returning 404s. It's the easiest way to deal with the HTML5 History API.
app.get('/:locale/*', locals, renderIndex);

module.exports = {
  supportedLocales: locales,
  middleware: app
};
