'use strict';

// @ngInject
module.exports = function ($scope, updateURL) {
  $scope.log = [];
  //better error handling?
  try {
    var state = updateURL.getState();
    $scope.state = state.visualizations[0];
    $scope.state.options.labels.notes = atob($scope.state.options.labels.notes || '');
  }
  catch (err) {
    $scope.error = err.message;
  }
};
