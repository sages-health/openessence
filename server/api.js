'use strict';

var express = require('express');
var passport = require('passport');
var routes = require('./routes');

module.exports = function () {
  var app = express();
  app.use(function (req, res, next) {
    passport.authenticate('bearer', {session: false}, function (err, user) {
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

          res.locals.user = user;
          res.locals.persona = false;
          next();
        });
      } else {
        res.json(401, {
          message: 'Bad credentials'
        });
      }
    })(req, res, next);
  });

  app.use(routes.server());

  // forward to client
  app.use(routes.client());

  return app;
};
