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
          templateUrl: '/public/partials/login.html',
          controller: 'LoginCtrl'
        })
        .when('/', {
          templateUrl: '/public/partials/home.html',
          controller: 'MainCtrl'
        })
        .otherwise({
          redirectTo: '/'
        });
    });

  return app;
});
