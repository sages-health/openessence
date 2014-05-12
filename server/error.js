'use strict';

var logger = require('./conf').logger;

// catchall error middleware that returns 500
exports.middleware = function errorMiddleware (err, req, res, next) {
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

  res.status(err.status || 500)
    .format({
      html: function () {
        res.render('error.html', {
          error: err
        });
      },
      json: function () {
        res.send({
          error: {
            name: err.name || 'ServerError',
            message: err.message || 'Server error'
          }
        });
      }
    });
};

exports.notFound = function notFound (req, res) {
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
};
