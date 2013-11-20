'use strict';

var Sequelize = require('sequelize');
var env = process.env;
var sequelize = new Sequelize(env.DB_NAME, env.DB_USERNAME, env.DB_PASSWORD, JSON.parse(env.DB_OPTIONS));

// inspired by http://redotheweb.com/2013/02/20/sequelize-the-javascript-orm-in-practice.html
['User' /* add more models as needed */].forEach(function (model) {
  exports[model] = sequelize.import(__dirname + '/' + model);
});

exports.sequelize = sequelize;
