'use strict';

var express = require('express');
var DefaultController = require('./controller');
var models = require('./models')();
var controllers = require('./controllers')();

module.exports = function () {
  var app = express();

  // Make sure we include the middleware we need so we can test this controller in isolation.
  // It's not a big deal that body-parser is also included in ../index.js, since it checks to see if it's already been
  // included: `if (req._body) return next();`
  app.use(require('body-parser')());

  app.param('model', function (req, res, next, model) {
    var Model = models[model.toLowerCase()];
    if (!Model) {
      next(new Error('No such model ' + model));
      return;
    }
    req.model = new Model();

    var Controller = controllers[model.toLowerCase()];
    if (Controller) {
      console.log('controller');
      req.controller = new Controller();
    } else {
      console.log('default controller');
      req.controller = new DefaultController();
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
    req.controller.queryAll(req, res, next);
  });

  app.get('/:model/:id', function (req, res, next) {
    req.controller.query(req, res, next);
  });

  app.post('/:model', function (req, res, next) {
    req.controller.update(req, res, next);
  });

  // POST /:model/:id doesn't make sense

  app.post('/:model/search', function (req, res, next) {
    req.controller.queryAll(req, res, next);
  });

  app.put('/:model', function (req, res, next) {
    req.controller.updateAll(req, res, next);
  });

  app.put('/:model/:id', function (req, res, next) {
    req.controller.update(req, res, next);
  });

  app.delete('/:model', function (req, res, next) {
    req.controller.deleteAll(req, res, next);
  });

  app.delete('/:model/:id', function (req, res, next) {
    req.controller.delete(req, res, next);
  });

  app.use(function (err, req, res, next) {
    // If the error has a status, use that (codex custom errors do this).
    // Otherwise, try to assign an appropriate HTTP status code based on error
    // TODO: Expand this to accommodate other ES errors
    if (!err.status && err.constructor.name === 'StatusCodeError') {
      if (/^Not Found/.test(err.message) || /^IndexMissingException/.test(err.message)) {
        err.status = 404;
      } else if (/^Bad Request/.test(err.message)) {
        err.status = 400;
      }
    }

    // This handler only corrects status codes from ElasticSearch / these methods
    // TODO: File a pull request with ES to get their StatusCodeError fixed
    next(err);
  });

  return app;
};
