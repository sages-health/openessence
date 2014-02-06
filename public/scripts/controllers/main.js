'use strict';

angular.module('fracasApp')
  .controller('MainCtrl', function ($scope, $location, user) {
    if (!user.username) {
      $location.path('/login').replace();
      return;
    }
  });
