'use strict';

angular.module('openessenceApp')
  .controller('MainCtrl', function ($scope, $http) {
    $scope.login = function () {
      $http({
        method: 'POST',
        url: '/login'
      });
    };
  });
