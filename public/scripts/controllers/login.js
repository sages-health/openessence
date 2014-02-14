'use strict';

var angular = require('angular');
var controllers = require('../controllers');

var loginCtrl = function ($scope, $http) {
  $scope.login = function () {
    $http({
      method: 'POST',
      url: '/login'
    });
  };
};

// `controllers.controller` breaks ngmin, see https://github.com/btford/ngmin#references
angular.module(controllers.name).controller('LoginCtrl', loginCtrl);

module.exports = loginCtrl;
