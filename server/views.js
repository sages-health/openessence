'use strict';

var _ = require('lodash');
var ejs = require('ejs');
var conf = require('./conf');
var env = conf.env;

var directory = (function () {
  if (env === 'development' || env === 'test') {
    return __dirname + '/../views';
  } else if (env === 'production') {
    return __dirname + '/../dist/views';
  } else {
    throw new Error('Unknown environment ' + env);
  }
})();

module.exports = {
  directory: directory,
  engine: function (path, options, callback) {
    options = _.assign({
      open: '[[', // htmlmin likes to escape <, and {{ is used by Angular
      close: ']]'
    }, options);
    ejs.renderFile(path, options, callback);
  }
};
