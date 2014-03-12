'use strict';

var angular = require('angular');
var controllers = require('../../modules').controllers;

angular.module(controllers.name).controller('VisitEntryCtrl', function ($scope, $http, gettext) {
  $scope.agePlaceholder = gettext('Patient\'s age');

  $scope.isInvalid = function (field) {
    return field.$invalid && !field.$pristine;
  };

  $scope.submit = function () {
    $http({
      method: 'POST',
      url: '/visits',
      data: $scope.visit
    });
  };
});
