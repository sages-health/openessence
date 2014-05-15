'use strict';

var angular = require('angular');
var controllers = require('../modules').controllers;

// `controllers.controller` breaks ngmin, see https://github.com/btford/ngmin#references
angular.module(controllers.name).controller('LoginCtrl', function ($scope, $location, $window, user) {
  $scope.$on('login', function () {
    // We do this here, instead of in the user service, b/c we only want to redirect to the home page when the user's
    // coming from the login page. In the re-login case, we definitely don't want to redirect to the home page.
    $location.path('/');
  });

  $scope.promptForLogin = function () {
    user.login('persona');
  };

  $scope.credentials = {};

  $scope.$on('loginError', function (event, response) {
    if (response.data.error && response.data.error.name === 'UnregisteredUserError') {
      // TODO do something better
      /*jshint quotmark:false */
      $window.alert("Sorry, but you're not registered. Please contact your site admin to sign up.");
    } else {
      // TODO mark form as invalid instead
      $window.alert(response.data.message);
    }
  });

  $scope.submit = function (form) {
    if (form.$invalid) {
      $scope.yellAtUser = true;
    } else {
      user.login('local', $scope.credentials);
    }
  };
});
