'use strict';

var conf = require('./conf');

// variables for views, this must be before the views are rendered and after any necessary request variables are set
function locals (req, res, next) {
  res.locals.user = req.user;
  if (req.csrfToken) { // not every request has CSRF token
    res.locals.csrfToken = req.csrfToken();
  }
  res.locals.lang = req.locale;
  res.locals.persona = conf.persona.enabled;
  res.locals.baseHref = conf.url + '/' + req.locale + '/'; // use proxy URL (if applicable), not req.url
  res.locals.environment = conf.env;

  next();
}

module.exports = locals;
