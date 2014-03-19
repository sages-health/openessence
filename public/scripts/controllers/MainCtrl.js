'use strict';

var angular = require('angular');
var controllers = require('../modules').controllers;

angular.module(controllers.name).controller('MainCtrl', function ($scope, $window, $state, user, login) {
  $scope.user = user;
  $scope.logout = function () {
    login.logout();

    // wait for acknowledgement of logout from server before reloading
    $scope.$on('logout', function () {
      // TODO implement logout view with a nice message like "Sorry to see you go"

      // reload page for added security so stale data doesn't remain
      $window.location.reload();
    });
  };

  $scope.currentPath = $window.encodeURIComponent($state.href($state.current, $state.params));

  $scope.isActive = function (stateName) {
    return stateName === $state.current.name;
  };
});
