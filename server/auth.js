'use strict';

var passport = require('passport');
var BearerStrategy = require('passport-http-bearer').Strategy; // for API clients
var LocalStrategy = require('passport-local').Strategy;
var PersonaStrategy = require('passport-persona').Strategy;

var conf = require('./conf');
var logger = conf.logger;
var User = require('./codex/models/user');
var errors = require('./error');

passport.serializeUser(function (user, done) {
  // store entire user object in session so we don't have to deserialize it from data store
  // this won't scale to large number of concurrent users, but it will be faster for small deployments
  done(null, user);
});
passport.deserializeUser(function (user, done) {
  // no need to deserialize, we store entire user in memory
  done(null, user);
});

passport.use(new PersonaStrategy({
  // audience must match the URL clients use to hit the site, otherwise Persona will think we're phishing and error out
  audience: conf.url
}, function (email, callback) {

  var localUser = conf.users[email];
  if (localUser) {
    localUser.username = email;
    localUser.authType = 'persona';
    logger.info({user: localUser}, '%s logged in with Persona via file system whitelist', email);
    callback(null, localUser);
    return;
  }

  // This means that to switch between Persona and local, your local username must be your email.
  // We may need to reevaluate that in the future.
  new User().findByUsername(email, function (err, user) {
    delete user.password; // don't keep (hashed) password in memory any more than we have to

    if (err) {
      callback(err);
      return;
    }

    if (!user) {
      /*jshint quotmark:false */
      logger.info({user: user}, "%s logged in successfully with Persona, but they're not recognized by codex", email);
      callback(new errors.UnregisteredUserError());
      return;
    }

    logger.info({user: user}, '%s logged in using Persona', email);
    user.authType = 'persona';

    callback(null, user);
  });
}));

passport.use(new LocalStrategy(function (username, password, callback) {
  new User().findByUsername(username, function (err, user) {
    if (err) {
      callback(err);
      return;
    }

    if (!user) {
      // Hash anyway to prevent timing attacks.
      // No idea what this hash is (not that it matters), but it's taken from https://gist.github.com/damianb/4190316
      User.checkPassword('$2a$10$va3CGzjy.g/Z8cuEcO844O', 'test', function (err) {
        if (err) {
          callback(err);
        } else {
          callback(null, false);
        }
      });

      return;
    }

    // Check password before we check if user is disabled. Again, this is to prevent timing attacks.
    User.checkPassword(new Buffer(user._source.password, 'hex'), new Buffer(password, 'utf8'), function (err, match) {
      if (err) {
        callback(err);
        return;
      }

      if (!match) {
        // Security 101: don't tell the user if it was the username or password that was wrong
        callback(null, false, {message: 'Incorrect username/password'});
      } else if (user._source.disabled === true) {
        logger.info('%s tried to log in, but their account is disabled', username);
        callback(null, false, {message: 'Account disabled'});
      } else {
        logger.info({user: user}, '%s logged in using local auth', username);
        user._source.authType = 'local';

        callback(null, user._source);
      }
    });
  });
}));

passport.use(new BearerStrategy({}, function (token, done) {
  var user = {}; // TODO lookup user by token

  if (!user) {
    done(null, false);
    return;
  }

  done(null, user);
}));

function accessDeniedHandler (req, res) {
  logger.info({req: req}, 'Blocked unauthorized request to ' + req.url); // bunyan FTW!
  var action = 'access ' + req.originalUrl;

  res.status(401);
  res.set('WWW-Authenticate', 'None');

  res.format({
    html: function () {
      res.render('401.html', {
        action: action
      });
    },
    json: function () {
      res.send({
        error: 'Access denied: you don\'t have permission to ' + action
      });
    }
  });
}

function denyAnonymousAccess (req, res, next) {
  if (!req.user) {
    accessDeniedHandler(req, res);
  } else {
    next();
  }
}

module.exports = {
  passport: passport,
  accessDeniedHandler: accessDeniedHandler,
  denyAnonymousAccess: denyAnonymousAccess
};
