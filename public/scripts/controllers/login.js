define(['angular', 'controllers'], function (angular, controllers) {
  'use strict';

  // `controllers.controller` breaks ngmin, see https://github.com/btford/ngmin#references
  angular.module(controllers.name)
    .controller('LoginCtrl', function ($scope, $http) {
      $scope.login = function () {
        $http({
          method: 'POST',
          url: '/login'
        });
      };
    });
});
