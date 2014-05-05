'use strict';

var path = require('path');
var express = require('express');
var glob = require('glob');
var conf = require('../conf');

module.exports = function () {
  var app = express();

  // Mount controllers
  glob('controllers/*.js', {cwd: __dirname}, function (err, files) {
    if (err) {
      conf.logger.error(err);
      return;
    }

    // Filter out example files
    var exampleRegex = /.*\.example\.js$/;
    files = files.filter(function (item) {
      var isExample = exampleRegex.test(item);
      if (isExample) {
        conf.logger.debug('Skipping example controller: %s', path.basename(item));
      }
      return !isExample;
    });

    files.forEach(function (controller) {
      var name = path.basename(controller, '.js').toLowerCase();
      conf.logger.info('Found resource controller: /%s', name);

      // mount each controller at model name
      app.use('/' + name, require('./' + controller));
    });
  });

  // Default handlers for resource CRUD and querying
  app.use(require('./controller')().middleware());

  return app;
};
