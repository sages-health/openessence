'use strict';

var _ = require('lodash');
var path = require('path');
var express = require('express');
var glob = require('glob');
var conf = require('../conf');
var resource = require('./resource');

var app = express();

// Enable JSON body parsing (but not all of bodyParser)
app.use(express.json());

// Deserialize the model/instance from the URL
app.use(resource.serialize());

// Mount controllers
glob('controllers/*.js', {cwd: __dirname}, function (err, files) {
  if (err) {
    conf.logger.error(err);
    return;
  }

  // Filter out example files
  var exampleRegex = /.*\.example\.js$/;
  files = _.filter(files, function (item) {
    var isExample = exampleRegex.test(item);
    if (isExample) {
      conf.logger.debug('Skipping example controller: %s', path.basename(item));
    }
    return !isExample;
  });

  files.forEach(function (controller) {
    var name = path.basename(controller, '.js').toLowerCase();
    conf.logger.info('Found resource controller: /%s', name);
    app.use('/' + name, require('./' + controller));
  });
});

// Default handlers for resource CRUD and querying
app.use(resource.controller());

module.exports = app;
