'use strict';

var angular = require('angular');
var controllers = require('../modules').controllers;

angular.module(controllers.name).controller('ReloginCtrl', function ($scope, $modal) {
  $modal.open({
    template: require('../../partials/relogin.html'),
    controller: ['$scope', '$modalInstance', 'user', function ($scope, $modalInstance, user) {
      $scope.$on('login', function () {
        $modalInstance.dismiss('login');
        // we could return to previous state here, but we'll let login event listeners handle that
      });

      $scope.promptForLogin = function () {
        user.login('persona'); // TODO show appropriate login view for user.authType
      };
    }],
    scope: $scope,

    // we don't want users to be able to dismiss dialog without logging back in
    backdrop: 'static', // don't allow closing via clicking outside modal
    keyboard: false // don't allow closing via ESC key
  });
});
