'use strict';

var fs = require('fs');
var express = require('express');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;

var app = express();
app.use(express.logger());

// load developer settings
if (fs.existsSync(__dirname + '/dev.js')) {
  require('./dev');
}

var env = process.env.NODE_ENV || 'development';

app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(express.cookieParser());
app.use(express.session({
  // using randomBytes means sessions won't be preserved through server restarts
  secret: process.env.SESSION_SECRET || require('crypto').randomBytes(1024).toString('hex')
}));
app.use(require('connect-flash')());
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
    res.render('error.html', {
      error: err
    });
  }
});

app.engine('html', require('ejs').renderFile);

if (env === 'development') {
  app.set('views', 'app');
  app.use(express.static('.tmp'));
  app.use('/kibana', express.static('app/kibana/src'));
  app.use(express.static('app'));
} else if (env === 'test') {
  app.set('views', 'app');
  app.use(express.static('.tmp'));
  app.use(express.static('test'));
} else if (env === 'production') {
  app.set('views', 'dist');
  app.use('/kibana', express.static('app/kibana/dist'));
  app.use(express.static('dist'));
} else {
  throw new Error('Unknown environment ' + env);
}

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


app.get('/', function (request, response) {
  response.render('index.html');
});

app.post('/login', passport.authenticate('local', {
  successRedirect: '/kibana',
  failureRedirect: '/',
  failureFlash: true
}));

// this MUST be the last route
app.use(function (req, res) {
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
