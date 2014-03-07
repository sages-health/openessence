'use strict';

var angular = require('angular'); // TODO https://github.com/mgechev/angularjs-style-guide
var controllers = require('../controllers');
require('../services/user');
require('../services/login');

var NAME = 'LoginCtrl';

// `controllers.controller` breaks ngmin, see https://github.com/btford/ngmin#references
angular.module(controllers.name).controller(NAME, function ($scope, $http, $location, $q, user, login) {
  if (user.isLoggedIn()) { // TODO do this in router
    $location.path('/').replace();
    return;
  }

  $scope.$on('login', function () {
    $location.path('/');
  });

  $scope.promptForLogin = function () {
    login.prompt();
  };
});

// export name, not function, so clients don't try to use this instead of DI
module.exports = NAME;
