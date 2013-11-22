'use strict';

exports.accessDeniedHandler = function (req, res) {
  console.trace('Blocked unauthorized request to ' + req.url);
  var action = 'access ' + req.originalUrl;

  res.status(403);
  res.format({
    html: function () {
      res.render('403.html', {
        action: action
      });
    },
    json: function () {
      res.send({
        error: 'Access denied: you don\'t have permission to ' + action
      });
    }
  });
};

exports.denyAnonymousAccess = function (req, res, next) {
  if (!req.user) {
    exports.accessDeniedHandler(req, res);
  } else {
    next();
  }
};
