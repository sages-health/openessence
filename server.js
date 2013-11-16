'use strict';

var express = require('express');
//var passport = require('passport');

var app = express();
app.use(express.logger());

var env = process.env.NODE_ENV || 'development';

app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(app.router);
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

app.get('/', function (request, response) {
  response.render('index.html');
});

//app.post('/login', passport.authenticate('local', {
//  successRedirect: '/kibana/dist',
//  failureRedirect: '/'
//}));

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
    console.log('Listening on ' + port);
  });
}
