'use strict';

var angular = require('angular');
var controllers = require('../modules').controllers;

angular.module(controllers.name).controller('NotFoundCtrl', function ($scope, previousState) {
  var path = previousState.path;
  if (path) {
    $scope.displayUrl = path;
    $scope.url = path.substring(1); // remove leading /
  }
});
