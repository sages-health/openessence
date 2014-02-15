'use strict';

var angular = require('angular');
var controllers = require('../controllers');

var NAME = 'LoginCtrl';

// `controllers.controller` breaks ngmin, see https://github.com/btford/ngmin#references
angular.module(controllers.name).controller(NAME, function ($scope, $http) {
  $scope.login = function () {
    $http({
      method: 'POST',
      url: '/login'
    });
  };
});

// export name, not function, so clients don't try to use this instead of DI
module.exports = NAME;
