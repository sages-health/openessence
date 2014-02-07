define([
  'angular',
  'controllers',
  'directives',
  'services',
  'filters',
  'controllers/main',
  'controllers/login'
], function (angular, controllers, directives, services, filters) {
  'use strict';

  var app = angular.module('fracasApp', [controllers.name, directives.name, services.name, filters.name]);
  app.config(function ($routeProvider) {
      $routeProvider
        .when('/login', {
          templateUrl: 'partials/login.html',
          controller: 'LoginCtrl'
        })
        .when('/', {
          templateUrl: 'partials/home.html',
          controller: 'MainCtrl'
        })
        .otherwise({
          redirectTo: '/'
        });
    });

  return app;
});
