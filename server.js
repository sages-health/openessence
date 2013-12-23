'use strict';

var express = require('express');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;

var conf = require('./server/conf');
var logger = conf.logger;
var staticResources = require('./server/staticResources');
var accessControl = require('./server/accessControl');

var app = express();

app.use(express.favicon('public/favicon.ico'));
app.use(express.logger());
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(express.cookieParser());
app.use(express.session({
  secret: conf.settings.SESSION_SECRET,
  cookie: {
    path: '/',
    httpOnly: true,
    maxAge: null
//    secure: true // force HTTPS
  }
}));
app.use(require('connect-flash')());

app.use(staticResources.anonymousResources(conf.env, express));

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
app.set('views', require('./server/views')(conf.env));

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

app.use('/kibana', staticResources.kibana(conf.env, express));

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
  var childProcess = require('child_process');

  var syncer = childProcess.fork(__dirname + '/server/es/pgsyncer');
  logger.info('Spawned pgsyncer child pid %d', syncer.pid); // so user knows what to kill, if need be

  syncer.on('error', function (err) {
    console.error('Error in pgsqync child process');
    console.error(err);
  });
  syncer.on('exit', function () {
    console.error('syncer child process exited');
  });

  logger.info('Waiting 10s before starting reindexing');
  setTimeout(function () {
    var reindexer = childProcess.fork(__dirname + '/server/es/reindexer');
    logger.info('Spawned reindexer child pid %d', reindexer.pid);

    reindexer.on('exit', function () {
      logger.info('reindexer exited');

      // install cron job after reindexer is done
      var CronJob = require('cron').CronJob;
      // run every day at 3 AM
      new CronJob('00 00 3 * * *', function () { // TODO test this
        logger.info('Cron job is running reindexer');
        var child = childProcess.fork(__dirname + '/server/es/reindexer');
        logger.info('Spawned reindexer child pid %d', child.pid);
      });
    });
  }, 10000);

  var port = process.env.PORT || 9000;
  app.listen(port, function () {
    // must log to stdout (some 3rd party tools read stdout to know when web server is up)
    console.log('Listening on port ' + port);
  });
}
