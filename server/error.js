'use strict';

var Boom = require('boom');
var _ = require('lodash');
var express = require('express');
var conf = require('./conf');
var logger = conf.logger;
var views = require('./views');

var app = express();
app.set('views', views.directory);
app.engine('html', views.engine);

function errorMiddleware (err, req, res, next) {
  if (!err) {
    // this shouldn't happen, since all middleware with arity 4 is error middleware, but better safe than sorry
    return next();
  }

  if (conf.env !== 'test') { // don't spam when we're testing, our assertions are enough
    logger.error({
      err: err,
      req: req,
      user: req.user
    });
  }

  if (!(err instanceof Error)) {
    logger.error('Middleware threw a non-error object: ', err);
    err = _.assign(new Error(), err);
  }

  if (!err.isBoom) {
    err = Boom.wrap(err, err.status); // some express middleware, like csurf, set err.status
  }

  var status = (err.output ? err.output.statusCode : 500) || 500;

  if (status === 401) {
    // 401 MUST set WWW-Authenticate
    res.set('WWW-Authenticate', 'None');
  }

  res.status(status)
    .format({
      // prefer JSON
      json: function () {
        res.send(err.data); // output.payload is non-RESTful junk
      },
      html: function () {
        var view = 'error.html';
        if (status === 401) {
          view = '401.html';
        } else if (status === 404) {
          // we also have a separate notFound handler b/c this doesn't work for some reason
          view = '404.html';
        }

        res.render(view, {
          error: err,
          url: req.url
        });
      }
    });
}

app.use(errorMiddleware);

function notFound (req, res) {
  // you'd think you'd be able to return an error and have the error handler take care of it, but that doesn't work
  logger.info({req: req}, 'Returning 404 for request');

  res.status(404)
    .format({
      json: function () {
        res.send();
      },
      html: function () {
        res.render('404.html', {
          url: req.url
        });
      }
    });
}

app.use(notFound);

module.exports = {
  middleware: errorMiddleware,
  notFound: app // making this a middleware function causes all sorts of issues
};
