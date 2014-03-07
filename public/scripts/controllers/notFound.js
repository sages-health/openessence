'use strict';

var angular = require('angular');
var controllers = require('../controllers');

var NAME = 'NotFoundCtrl';

angular.module(controllers.name).controller(NAME, function ($scope, previousState) {
  var path = previousState.path;
  if (path) {
    $scope.displayUrl = path;
    $scope.url = path.substring(1); // remove leading /
  }
});

module.exports = NAME;
