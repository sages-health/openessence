'use strict';

/**
 * Returns an express app that serves static resources that do not require authentication.
 */
exports.anonymousResources = function (env, express) {
  var app = express();
  if (env === 'development') {
    app.use(express.static('.tmp'));
    app.use(express.static('public'));

    app.use('/.tmp', express.static('.tmp'));
    app.use('/public', express.static('public'));
  } else if (env === 'test') {
    app.use(express.static('.tmp'));
    app.use(express.static('test'));

    app.use('/.tmp', express.static('.tmp'));
    app.use('/test', express.static('test'));
  } else if (env === 'production') {
    app.use(express.static('dist/public'));

    app.use('/public', express.static('dist/public'));
  } else {
    throw new Error('Unknown environment ' + env);
  }

  return app;
};

/**
 * Returns an express app that serves static Kibana resources.
 */
exports.kibana = function (env, express) {
  var app = express();
  if (env === 'development') {
    app.use(express.static('kibana/src'));
  } else if (env === 'test') {
    app.use(express.static('kibana/dist'));
  } else if (env === 'production') {
    app.use(express.static('kibana/dist'));
  } else {
    throw new Error('Unknown environment ' + env);
  }

  return app;
};
