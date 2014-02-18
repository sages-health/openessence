'use strict';

var angular = require('angular');
var controllers = require('../controllers');
require('../services/user');

var NAME = 'MainCtrl';

angular.module(controllers.name).controller(NAME, function ($scope, $location, user) {
  if (!user.isLoggedIn()) {
    $location.path('/login').replace();
    return;
  }

  $scope.user = user;
  $scope.logout = function () {
    navigator.id.logout();
  };
});

module.exports = NAME;
