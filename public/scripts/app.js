'use strict';

var angular = require('angular');
require('angular-route');
require('angular-sanitize');
require('angular-bootstrap');

var controllers = require('./controllers');
var directives = require('./directives');
var services = require('./services');
var filters = require('./filters');
require('./services/csrfToken');

// controllers must be required up here so any dependent services are initialized first
var loginCtrl = require('./controllers/login');
var mainCtrl = require('./controllers/main');

var app = angular.module('fracasApp', ['ngRoute', 'ngSanitize', 'ui.bootstrap',
                                       controllers.name, directives.name, services.name, filters.name]);

app.config(function ($httpProvider, csrfToken) {
  ['post', 'put', 'delete', 'patch'].forEach(function (method) {
    // ng doesn't have default DELETE header
    if (!$httpProvider.defaults.headers[method]) {
      $httpProvider.defaults.headers[method] = {};
    }
    $httpProvider.defaults.headers[method]['X-CSRF-TOKEN'] = csrfToken;
  });
});

app.config(function ($routeProvider) {
  $routeProvider
    .when('/', {
      templateUrl: '/public/partials/home.html',
      controller: mainCtrl
    })
    .when('/login', {
      templateUrl: '/public/partials/login.html',
      controller: loginCtrl
    })
    .otherwise({
      redirectTo: '/'
    });
});

module.exports = app;
