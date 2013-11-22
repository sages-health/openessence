'use strict';

var fs = require('fs');
var express = require('express');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var staticResources = require('./server/staticResources');
var accessControl = require('./server/accessControl');

var app = express();

// load developer settings
if (fs.existsSync(__dirname + '/dev.js')) {
  require('./dev');
}

var env = process.env.NODE_ENV || 'development'; // TODO use app.get('env');

app.use(express.favicon('app/favicon.ico'));
app.use(express.logger());
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(express.cookieParser());
app.use(express.session({
  // using randomBytes means sessions won't be preserved through server restarts
  secret: process.env.SESSION_SECRET || require('crypto').randomBytes(1024).toString('hex'),
  cookie: {
    path: '/',
    httpOnly: true,
    maxAge: null
//    secure: true // force HTTPS
  }
}));
app.use(require('connect-flash')());

app.use(staticResources.anonymousResources(env, express));

app.use(passport.initialize());
app.use(passport.session());

app.use(app.router);

app.use(function errorHandler(err, req, res, next) {
  if (!err) {
    // this shouldn't happen, since all middleware with arity 4 is error middleware, but better safe than sorry
    next();
  } else {
    console.error(err.stack);
    res.status(500);
    res.format({
      html: function () {
        res.render('error.html', {
          error: err
        });
      },
      json: function () {
        res.send({
          error: 'Server error'
        });
      }
    });
  }
});

app.engine('html', require('ejs').renderFile);
app.set('views', require('./server/views')(env));

// see http://redotheweb.com/2013/02/20/sequelize-the-javascript-orm-in-practice.html
var models = require('./server/models');
app.set('models', models);

passport.serializeUser(function (user, done) {
  done(null, user.id);
});
passport.deserializeUser(function (id, done) {
  models.User
    .find(id)
    .error(done)
    .success(function (user) {
      if (user) {
        done(null, user);
      } else {
        done(new Error('Unknown user ' + id));
      }
    });
});

passport.use(new LocalStrategy(function (username, password, done) {
  models.User
    .find({
      where: {
        name: username
      }
    })
    .error(done)
    .success(function (user) {
      if (!user) {
        return done(null, false, {
          // don't display this to the user, that would be an info leak
          message: 'Unknown username ' + username
        });
      }
      user.comparePassword(password, function (err, result) {
        if (err) {
          return done(err);
        }
        if (result) {
          return done(null, user);
        } else {
          return done(null, false, {
            message: 'Incorrect password'
          });
        }
      });
    });
}));

app.get('/', function (req, res) {
  if (req.user) {
    res.redirect(307, '/kibana');
  } else {
    res.render('login.html');
  }
});

app.post('/login', passport.authenticate('local', {
  successRedirect: '/kibana',
  failureRedirect: '/',
  failureFlash: true
}));

// all routes below this require authenticating
app.all('*', accessControl.denyAnonymousAccess);

app.use('/kibana', staticResources.kibana(env, express));

// this MUST be the last route
app.use(function (req, res) {
  console.trace(req.url + ' not found');
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
});

if (!module.parent) {
  var port = process.env.PORT || 9000;
  app.listen(port, function () {
    console.log('Listening on port ' + port);
  });
}
