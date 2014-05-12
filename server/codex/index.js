'use strict';

var express = require('express');
var DefaultController = require('./controller');
var models = require('./models')();
var controllers = require('./controllers')();
var esErrors = require('elasticsearch').errors;

module.exports = function () {
  var app = express();

  // Make sure we include the middleware we need so we can test this controller in isolation.
  // It's not a big deal that body-parser is also included in ../index.js, since it checks to see if it's already been
  // included: `if (req._body) return next();`
  app.use(require('body-parser')());

  app.param('model', function (req, res, next, model) {
    if (!req.model) {
      var Model = models[model.toLowerCase()];
      if (!Model) {
        next(new Error('No such model ' + model));
        return;
      }

      // TODO pass model to controller instead?
      req.model = new Model();
    }

    if (!req.controller) {
      var Controller = controllers[model.toLowerCase()];
      if (Controller) {
        req.controller = new Controller();
      } else {
        req.controller = new DefaultController();
      }
    }

    next();
  });

  app.param('id', function (req, res, next, id) {
    if (/^[\w-]+$/.test(id)) {
      req.instance = id;
      next();
    } else {
      // skip this route
      next('route');
    }
  });

  app.get('/:model', function (req, res, next) {
    req.controller.search(req, res, next);
  });

  app.get('/:model/:id', function (req, res, next) {
    req.controller.get(req, res, next);
  });

  // insert with no ID specified
  app.post('/:model', function (req, res, next) {
    req.controller.insert(req, res, next);
  });

  // POST /:model/:id doesn't make sense

  // alias for GET /:model that allows clients to specify search parameters as JSON in the POST body
  app.post('/:model/search', function (req, res, next) {
    req.controller.search(req, res, next);
  });

  // risky, and no usecase yet
//  app.put('/:model', function (req, res, next) {
//    req.controller.updateAll(req, res, next);
//  });

  // upsert - replace or insert
  app.put('/:model/:id', function (req, res, next) {
    req.controller.insert(req, res, next);
  });

  // risky, and no usecase yet
//  app.delete('/:model', function (req, res, next) {
//    req.controller.deleteAll(req, res, next);
//  });

  app.delete('/:model/:id', function (req, res, next) {
    req.controller.delete(req, res, next);
  });

  app.use(function (err, req, res, next) {
    // If the error has a status, use that (codex custom errors do this).
    // Otherwise, try to assign an appropriate HTTP status code based on error
    if (!err.status) {
      // see http://www.elasticsearch.org/guide/en/elasticsearch/client/javascript-api/current/errors.html
      if (err instanceof esErrors.ConnectionFault || err instanceof esErrors.NoConnections ||
          err instanceof esErrors.ServiceUnavailable) {
        err.status = 503; // Service Unavailable
      } else if (err instanceof esErrors.RequestTimeout) {
        err.status = 504; // Gateway Timeout
      } else if (err instanceof esErrors.PreconditionFailed) {
        err.status = 412;
      } else if (err instanceof esErrors.Conflict) {
        err.status = 409;
      } else if (err instanceof esErrors.Forbidden) {
        err.status = 403; // this could happen if you're proxying elasticsearch from codex
      } else if (err instanceof esErrors.NotFound) {
        err.status = 404;
      } else if (err instanceof esErrors.BadRequest) {
        err.status = 400;
      } else {
        err.status = 500;
      }
    }

    next(err);
  });

  return app;
};
