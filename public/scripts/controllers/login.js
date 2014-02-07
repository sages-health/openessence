define(['angular', 'controllers'], function (angular, controllers) {
  'use strict';

  controllers
    .controller('LoginCtrl', function ($scope, $http) {
      $scope.login = function () {
        $http({
          method: 'POST',
          url: '/login'
        });
      };
    });
});
