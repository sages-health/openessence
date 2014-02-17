'use strict';

var angular = require('angular');
require('angular-route');

var controllers = require('./controllers');
var directives = require('./directives');
var services = require('./services');
var filters = require('./filters');

// controllers must be required up here so any dependent services are initialized first
var loginCtrl = require('./controllers/login');
var mainCtrl = require('./controllers/main');

var app = angular.module('fracasApp', ['ngRoute', controllers.name, directives.name, services.name, filters.name]);
app.config(function ($routeProvider) {
  $routeProvider
    .when('/login', {
      templateUrl: '/public/partials/login.html',
      controller: loginCtrl
    })
    .when('/', {
      templateUrl: '/public/partials/home.html',
      controller: mainCtrl
    })
    .otherwise({
      redirectTo: '/'
    });
});

module.exports = app;
