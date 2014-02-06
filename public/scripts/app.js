(function (angular) {
  'use strict';

  // define module names
  var modules = ['controllers', 'directives', 'factories', 'services', 'filters'].map(function (module) {
    return 'fracas.' + module;
  });

  // register modules
  modules.forEach(function (m) {
    angular.module(m, []);
  });

  angular.module('fracasApp', modules)
    .config(function ($routeProvider) {
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
})(angular);
