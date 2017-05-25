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
  res.locals.appName = conf.appName;
  res.locals.version = pjson.version;
  res.locals.commit = process.env.COMMIT_HASH || '';
  res.locals.mapUrl = conf.MAP_URL || '';
  res.locals.mapLatitude = conf.MAP_LATITUDE || 0.0;
  res.locals.mapLongitude = conf.MAP_LONGITUDE || 0.0;
  res.locals.repoUrl = conf.REPO_URL || 'https://github.com/sages-health/openessence';

  if (process.env.DEPLOY_DATE) {
    // DEPLOY_DATE is in seconds since that's what date +"%s" returns
    res.locals.deployDate = process.env.DEPLOY_DATE;
  } else {
    res.locals.deployDate = '';
  }

  next();
}
module.exports = locals;
