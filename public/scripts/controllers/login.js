'use strict';

var angular = require('angular');
var controllers = require('../controllers');
require('../services/user');

var NAME = 'LoginCtrl';

// `controllers.controller` breaks ngmin, see https://github.com/btford/ngmin#references
angular.module(controllers.name).controller(NAME, function ($scope, $http, $location, $q, user) {
  if (user.isLoggedIn()) {
    $location.path('/').replace();
    return;
  }

  $scope.promptForLogin = function () {
    navigator.id.request({
      siteName: 'Fracas'
      // TODO more options from https://developer.mozilla.org/en-US/docs/Web/API/navigator.id.request
    });
  };
});

// export name, not function, so clients don't try to use this instead of DI
module.exports = NAME;
