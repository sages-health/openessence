'use strict';

var angular = require('angular');
var controllers = require('../modules').controllers;

// `controllers.controller` breaks ngmin, see https://github.com/btford/ngmin#references
angular.module(controllers.name).controller('LoginCtrl', function ($scope, $location, $window, user, persona, version) {
  $scope.$on('login', function () {
    // We do this here, instead of in the user service, b/c we only want to redirect to the home page when the user's
    // coming from the login page. In the re-login case, we definitely don't want to redirect to the home page.
    $location.path('/');
  });

  $scope.promptForLogin = function () {
    user.login('persona');
  };

  $scope.credentials = {};
  $scope.persona = persona;
  $scope.version = version;

  $scope.showLocalSignInForm = function () {
    $scope.signInForm = true;
  };

  $scope.$on('loginError', function (event, response) {
    var error = response.data.error;
    if (!error) {
      return;
    }

    if (error === 'UnregisteredUser') {
      // TODO do something better
      /*jshint quotmark:false */
      $window.alert("Sorry, but you're not registered. Please contact your site admin to sign up.");
    } else if (error === 'BadCredentials') {
      $scope.badCredentials = true;
    }
  });

  $scope.isInvalid = function (field) {
    if ($scope.yellAtUser) {
      // if the user has already tried to submit, show them all the fields they're required to submit
      return field.$invalid;
    } else {
      // only show a field's error message if the user has already interacted with it, this prevents a ton of red
      // before the user has even interacted with the form
      return field.$invalid && !field.$pristine;
    }
  };

  $scope.submit = function (form) {
    $scope.badCredentials = false; // so that the bad credentials message can reappear if need be
    if (form.$invalid) {
      $scope.yellAtUser = true;
    } else {
      user.login('local', $scope.credentials);
    }
  };
});
