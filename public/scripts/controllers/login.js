'use strict';

angular.module('fracasApp')
  .controller('LoginCtrl', function ($scope, $http) {
    $scope.login = function () {
      $http({
        method: 'POST',
        url: '/login'
      });
    };
  });
