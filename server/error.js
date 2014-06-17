'use strict';

var util = require('util');
var Boom = require('boom');
var logger = require('./conf').logger;

function UnregisteredUserError (message) {
  message = message || 'Unregistered user';
  Error.call(this, message);
  this.message = message;
  this.name = this.constructor.name;
  this.status = 403;
  Error.captureStackTrace(this, UnregisteredUserError);
}
util.inherits(UnregisteredUserError, Error);

function BadCredentialsError (message) { // TODO delete
  message = message || 'Bad credentials';
  Error.call(this, message);
  this.message = message;
  this.name = this.constructor.name;
  this.status = 403;
  Error.captureStackTrace(this, BadCredentialsError);
}
util.inherits(BadCredentialsError, Error);

// catchall error middleware that returns 500
function errorMiddleware (err, req, res, next) {
  if (!err) {
    // this shouldn't happen, since all middleware with arity 4 is error middleware, but better safe than sorry
    next();
    return;
  }

  logger.error({
    err: err,
    req: req,
    user: req.user
  });

  if (!err.isBoom) {
    err = Boom.wrap(err);
  }

  res.status(err.output.statusCode)
    .format({
      // prefer JSON
      json: function () {
        res.send(err.data); // output.payload is non-RESTful junk

        // TODO test client
//        res.send({
//          error: {
//            name: err.name || 'ServerError',
//            message: err.message || 'Server error'
//          }
//        });
      },
      html: function () {
        res.render('error.html', {
          error: err
        });
      }
    });
}

function notFound (req, res) { // TODO refactor middleware into errors: errors are better because they can be used everywhere a callback is used and not just as middleware
  res.status(404);

  res.format({
    html: function () {
      res.render('404.html', {
        url: req.url
      });
    },
    json: function () {
      res.send({
        error: 'Not found'
      });
    }
  });
}

module.exports = {
  middleware: errorMiddleware,
  notFound: notFound,
  BadCredentialsError: BadCredentialsError,
  UnregisteredUserError: UnregisteredUserError
};
