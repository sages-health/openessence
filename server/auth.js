'use strict';

var passport = require('passport');
var BearerStrategy = require('passport-http-bearer').Strategy; // for API clients
var LocalStrategy = require('passport-local').Strategy;
var PersonaStrategy = require('passport-persona').Strategy;
var Boom = require('boom');

var conf = require('./conf');
var logger = conf.logger;
var User = require('./models/User');
//var crypto = require('crypto');

var setUserToken = function (user, callback) {
//  logger.info('*************%s setting user token', user);
//
//  crypto.randomBytes(256, function (ex, buf) {
//    if (ex) {
//      callback(ex, null);
//    } else {
//      var token = buf.toString('hex');
//      logger.info('*************%s successfuly assigned token: %s', user.doc.username, token);
//      user.doc.tokens = [token];
//      callback(null, user);
//    }
//  });
  callback(null, user);
};

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
      tokens: ['token1'],
      authType: 'persona',
      roles: ['admin']
    }));
  }

  var localUser = conf.users[email];
  if (localUser) {
    localUser.username = email;
    localUser.email = email;
    localUser.authType = 'persona';
    localUser.tokens = 'token1';
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

    setUserToken(user, function(err, user) {
      if (err) {
        callback(err);
      } else {
        callback(null, user);
      }
    });
    return;
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

        setUserToken(user, function(err, user) {
          if (err) {
            callback(err);
          } else {
            callback(null, user);
          }
        });
        return;
      }
    });
  });
}));

passport.use(new BearerStrategy({}, function (token, done) {
  // Look up whitelisted user by token
  if (conf.users) {

    var userFound = false;
    console.log('***** logged in using bearer strategy - token = %s', token);
    Object.keys(conf.users).forEach(function (username) {
      var user = conf.users[username];
      var tokens = user.tokens;
      var length = typeof tokens === 'undefined' ? 0 : tokens.length;

      for (var i = 0; i < length; i++) {
        if (tokens[i] === token) {
          logger.info('%s logged in using bearer auth', user.username);
          user.authType = 'bearer';
          userFound = true;
          console.dir(user);
          done(null, new User(user));
          return;
        }
      }
    });
    if (!userFound){
      return done(null, false, { message: 'Bearer token not found.' });
    }
  } else {
    console.log('***** logged in using bearer strategy, finding user by token = %s', token);
    new User().findByToken(token, function(err, user) {
      if (err) {
        done(err);
        return;
      }

      if (!user) {
        logger.info('Token:\n%s\ndid not match any users.', token);
        done(new errors.UnregisteredUserError());
        return;
      }

      delete user.doc.password; // don't keep (hashed) password in memory any more than we have to

      logger.info({user: user}, '%s logged in using bearer', user.doc.email || user.doc.username);
      user.doc.authType = 'bearer';
      done(null, user);
      return;
    });
    done(null, false);
  }
}));


function denyAnonymousAccess (req, res, next) {
  if (!req.user) {
    return next(Boom.unauthorized());
  } else {
    return next();
  }
}

function authenticate (strategy) {
  logger.info('Strategy: %s', strategy);
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
        if (strategy === 'bearer')  {
          return next();
        }
        res.status(200)
          .json({
            // whitelist user properties that are OK to send to client
            username: user.doc.username,
            tokens: user.doc.tokens,
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
