'use strict';

var angular = require('angular');
var controllers = require('../modules').controllers;

var modalCtrl = function ($scope, $modalInstance, login) {
  $scope.$on('login', function () {
    $modalInstance.dismiss('login');
    // we could return to previous state here, but we'll let login event listeners handle that
  });

  $scope.promptForLogin = function () {
    login.prompt();
  };
};
// b/c ngmin doesn't like anonymous controllers
modalCtrl.$inject = ['$scope', '$modalInstance', 'login'];

angular.module(controllers.name).controller('ReloginCtrl', function ($scope, $modal) {
  $modal.open({
    template: require('../../partials/relogin.html'),
    controller: modalCtrl,
    scope: $scope,

    // we don't want users to be able to dismiss dialog without logging back in
    backdrop: 'static', // don't allow closing via clicking outside modal
    keyboard: false // don't allow closing via ESC key
  });
});
