define([
  'angular',
  'controllers',
  'services/user'
], function (angular, controllers) {
  'use strict';

  angular.module(controllers.name)
    .controller('MainCtrl', function ($scope, $location, user) {
      if (!user.username) {
        $location.path('/login').replace();
        return;
      }
    });
});
