'use strict';

var express = require('express');
var esErrors = require('elasticsearch').errors;
var Boom = require('boom');


function codexMiddleware (controller) {
  var app = express();

  // Make sure we include the middleware we need so we can test this controller in isolation.
  // It's not a big deal that body-parser is also included in ../index.js, since it checks to see if it's already been
  // included: `if (req._body) return next();`
  app.use(require('body-parser').json());

  app.param('id', function (req, res, next, id) {
    if (/^[\w-]+$/.test(id)) {
      next();
    } else {
      // skip this route
      next('route');
    }
  });

  if (controller.search) {
    app.get('/', controller.search.bind(controller));

    // alias for GET / that allows clients to specify search parameters as JSON in the POST body
    app.post('/search', controller.search.bind(controller));
  }

  if (controller.get) {
    app.get('/:id', controller.get.bind(controller));
  }

  if (controller.insert) {
    app.post('/', controller.insert.bind(controller));
  }

  if (controller.replace) {
    app.put('/:id', controller.replace.bind(controller));
  }

  if (controller.replaceAll) { // most apps should not be exposing this route
    app.put('/', controller.replaceAll.bind(controller));
  }

  if (controller.delete) {
    app.delete('/:id', controller.delete.bind(controller));
  }

  if (controller.deleteAll) { // most apps should not be exposing this route
    app.delete('/', controller.deleteAll.bind(controller));
  }

  // POST /:id doesn't make sense

  // error middleware
  app.use(function (err, req, res, next) {
    if (err.isBoom) {
      return next(err);
    }

    // see http://www.elasticsearch.org/guide/en/elasticsearch/client/javascript-api/current/errors.html
    if (err instanceof esErrors.ConnectionFault || err instanceof esErrors.NoConnections ||
      err instanceof esErrors.ServiceUnavailable) {
      return next(Boom.wrap(err, 503)); // Service Unavailable
    } else if (err instanceof esErrors.RequestTimeout) {
      return next(Boom.wrap(err, 504)); // Gateway Timeout
    } else if (err instanceof esErrors.PreconditionFailed) {
      return next(Boom.wrap(err, 412));
    } else if (err instanceof esErrors.Conflict) {
      return next(Boom.wrap(err, 409));
    } else if (err instanceof esErrors.Forbidden) {
      return next(Boom.wrap(err, 403)); // this could happen if you're proxying elasticsearch from codex
    } else if (err instanceof esErrors.NotFound) {
      return next(Boom.wrap(err, 404));
    } else if (err instanceof esErrors.BadRequest) {
      return next(Boom.wrap(err, 400));
    } else {
      return next(Boom.wrap(err, 500));
    }
  });

  // give controller fine-grained control over the middleware, if it wants it
  if (controller.middleware) {
    return controller.middleware(app) || app;
  }

  return app;
}

module.exports = codexMiddleware;
