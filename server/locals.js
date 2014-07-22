'use strict';

var conf = require('./conf');
var pjson = require('../package.json');

// variables for views, this must be before the views are rendered and after any necessary request variables are set
function locals (req, res, next) {
  res.locals.user = req.user ? req.user.doc : null;

  if (req.csrfToken) { // not every request has CSRF token
    res.locals.csrfToken = req.csrfToken();
  }
  res.locals.lang = req.locale;
  res.locals.persona = conf.persona.enabled;
  res.locals.baseHref = conf.url + '/' + req.locale + '/'; // use proxy URL (if applicable), not req.url
  res.locals.environment = conf.env;
  res.locals.version = pjson.version;
  res.locals.commit = process.env.COMMIT_HASH || '';

  if (process.env.DEPLOY_DATE) {
    // DEPLOY_DATE is in seconds since that's what date +"%s" returns
    res.locals.deployDate = parseInt(process.env.DEPLOY_DATE, 10) * 1000;
  } else {
    res.locals.deployDate = '';
  }

  next();
}
module.exports = locals;
