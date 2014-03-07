'use strict';

var angular = require('angular');
var controllers = require('../modules').controllers;

var NAME = 'MainCtrl';

angular.module(controllers.name).controller(NAME, function ($scope, $location, $window, $state, user, login) {
  if (!user.isLoggedIn()) { // TODO do this in router
    $location.path('/login').replace();
    return;
  }

  // On normal login, i.e. through the login page, this controller isn't in scope and so this event will not be
  // handled here. But when a user's session expires and they log back in, this controller will be in scope and thus
  // the event will be handled here
  $scope.$on('login', function () {
    //history.back(); // TODO this probably doesn't work in IE
  });

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
});

module.exports = NAME;
