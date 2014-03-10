'use strict';

var fs = require('fs');
var path = require('path');
var defaults = require('./defaults');

var env = defaults.env;
process.env.NODE_ENV = env;
var envFile = path.join(__dirname, env) + '.js';

if (!fs.existsSync(envFile)) {
  throw new Error('No such settings file ' + envFile);
  // TODO start up anyway but with a very stern warning that makes people change the default passwords
}

module.exports = require('./' + env);
