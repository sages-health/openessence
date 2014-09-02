'use strict';

// @ngInject
module.exports = function ($scope, previousState) {
  var path = previousState.path;
  if (path) {
    $scope.displayUrl = path;
    $scope.url = path.substring(1); // remove leading /
  }
};
