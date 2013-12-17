'use strict';

var _ = require('lodash');
var Sequelize = require('sequelize');
var fs = require('fs');
var path = require('path');

var conf = require('../conf');
var db = conf.db;
var logger = conf.logger;

// sequelize's API isn't great...
var sequelize = new Sequelize(db.name, db.username, db.password, _.extend({
  logging: logger.info
}, db));

// Assumes all .js files in this directory that begin with an uppercase letter are Sequelize models
var models = _.chain(fs.readdirSync(__dirname))
  .filter(function (filename) {
    var firstChar = path.basename(filename).charAt(0);
    return firstChar === firstChar.toUpperCase() && path.extname(filename) === '.js';
  })
  .map(function (filename) {
    return path.basename(filename, '.js');
  });

// inspired by http://redotheweb.com/2013/02/20/sequelize-the-javascript-orm-in-practice.html
models.forEach(function (model) {
  logger.debug('Importing model ' + model);
  exports[model] = sequelize.import(__dirname + '/' + model);
});

exports.sequelize = sequelize;
