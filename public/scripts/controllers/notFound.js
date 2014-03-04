'use strict';

var angular = require('angular');
var controllers = require('../controllers');

var NAME = 'NotFoundCtrl';

angular.module(controllers.name).controller(NAME, function ($scope, $window, previousPath) {
  $scope.displayUrl = previousPath;
  $scope.url = previousPath.substring(1); // remove leading /
});

module.exports = NAME;
