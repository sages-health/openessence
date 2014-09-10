'use strict';

var passport = require('passport');
var BearerStrategy = require('passport-http-bearer').Strategy; // for API clients
var LocalStrategy = require('passport-local').Strategy;
var PersonaStrategy = require('passport-persona').Strategy;
var Boom = require('boom');

var conf = require('./conf');
var logger = conf.logger;
var User = require('./models/User');

passport.serializeUser(function (user, done) {
  // store entire user object in session so we don't have to deserialize it from data store
  // this won't scale to large number of concurrent users, but it will be faster for small deployments
  done(null, user.doc);
});
passport.deserializeUser(function (user, done) {
  if (typeof user.codexModel === 'function') {
    // coming straight from authenticating
    return done(null, user);
  } else {
    // have to really deserialize
    return done(null, new User(user));
  }
});

passport.use(new PersonaStrategy({
  // audience must match the URL clients use to hit the site, otherwise Persona will think we're phishing and error out
  audience: conf.url
}, function (email, callback) {

  if (!conf.users) {
    // "Demo" mode: give any user who logs in via Persona full admin rights
    return callback(null, new User({
      username: email,
      email: email,
      authType: 'persona',
      roles: ['admin']
    }));
  }

  var localUser = conf.users[email];
  if (localUser) {
    localUser.username = email;
    localUser.email = email;
    localUser.authType = 'persona';
    logger.info({user: localUser}, '%s logged in with Persona via file system whitelist', email);
    return callback(null, new User(localUser));
  }

  // This means that to switch between Persona and local, your local username must be your email.
  // We may need to reevaluate that in the future.
  User.findByUsername(email, function (err, user) {
    if (err) {
      return callback(err);
    }

    if (!user) {
      /*jshint quotmark:false */
      logger.info({user: user}, "%s logged in successfully with Persona, but they're not recognized by codex", email);
      return callback(Boom.create(403, 'Unregistered user', {error: 'UnregisteredUser'}));
    }
    delete user.doc.password; // don't keep (hashed) password in memory any more than we have to

    logger.info({user: user}, '%s logged in using Persona', email);
    user.doc.authType = 'persona';

    return callback(null, user);
  });
}));

passport.use(new LocalStrategy(function (username, password, callback) {
  User.findByUsername(username, function (err, user) {
    if (err) {
      return callback(err);
    }

    if (!user) {
      // Hash anyway to prevent timing attacks. FYI: this string is "admin" hashed by scrypt with our parameters
      new User().verifyPassword(new Buffer('c2NyeXB0AAoAAAAIAAAAFuATEagqDpM/f/hC+pbzTtcyMM7iPtS+56BKc8v5yMVdblqKpzM/u0j7PKc9MYHHAbiLCM/jL9A3z0m7SKwv/RFutRwCvkO8C4KNbHiXs7Ia', 'base64'),
        new Buffer(password, 'utf8'), function (err) {
          // always pass false
          callback(err, false);
        });

      return;
    }

    // Check password before we check if user is disabled. Again, this is to prevent timing attacks.
    user.verifyPassword(new Buffer(password, 'utf8'), function (err, match) {
      delete user.doc.password;
      password = null; // can't hurt

      if (err) {
        return callback(err);
      }

      if (!match) {
        // Security 101: don't tell the user if it was the username or password that was wrong
        callback(null, false, {message: 'Incorrect username/password'});
      } else if (user.doc.disabled === true) {
        logger.info('%s tried to log in, but their account is disabled', username);
        callback(null, false, {message: 'Account disabled'});
      } else {
        logger.info({user: user}, '%s logged in using local auth', username);
        user.doc.authType = 'local';

        callback(null, user);
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

function denyAnonymousAccess (req, res, next) {
  if (!req.user) {
    return next(Boom.unauthorized());
  } else {
    return next();
  }
}

function authenticate (strategy) {
  return function (req, res, next) {
    passport.authenticate(strategy, {session: strategy !== 'bearer'}, function (err, user) {
      if (err) {
        return next(err);
      }

      if (!user) {
        return next(Boom.create(403, 'Bad credentials', {error: 'BadCredentials'}));
      }

      req.login(user, function (err) {
        if (err) {
          return next(err);
        }

        if (strategy === 'persona') {
          // Add user to database. We do this in parallel to not block the client's request.
          user.insert(function (err) {
            if (err) {
              // err will be a UniqueConstraintViolation if we already saved this user
              if (!err.data || err.data.error !== 'UniqueConstraintViolation' || err.data.field !== 'username') {
                return logger.error({err: err}, 'Error saving Persona user');
              }
            }
          });
        }

        res.status(200)
          .json({
            // whitelist user properties that are OK to send to client
            username: user.doc.username,
            email: user.doc.email,
            name: user.doc.name,
            roles: user.doc.roles,
            districts: user.doc.districts,
            authType: user.doc.authType
          });
      });
    })(req, res, next);
  };
}

module.exports = {
  passport: passport,
  denyAnonymousAccess: denyAnonymousAccess,
  persona: authenticate('persona'),
  local: authenticate('local'),
  bearer: authenticate('bearer')
};
