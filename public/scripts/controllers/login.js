'use strict';

var angular = require('angular');
var controllers = require('../controllers');
require('../services/user');

var NAME = 'LoginCtrl';

// `controllers.controller` breaks ngmin, see https://github.com/btford/ngmin#references
angular.module(controllers.name).controller(NAME, function ($scope, $http, $location, user) {
  $scope.login = function (attemptedUser) {
    $http({
      method: 'POST',
      url: '/login',
      data: attemptedUser
    }).success(function () {
      user.username = attemptedUser.username;
      $location.path('/');
    }).error(function () {
      // TODO check error, if bad auth then show bad auth view
    });
  };
});

// export name, not function, so clients don't try to use this instead of DI
module.exports = NAME;
