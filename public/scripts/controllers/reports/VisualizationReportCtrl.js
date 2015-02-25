'use strict';

// @ngInject
module.exports = function ($scope, updateURL, FormResource) {
  FormResource.get({size: 1, q: 'name:site'}, function (response) {
    if (response.results.length === 0) {
      console.error('No configured forms');
      return;
    }

    var form = response.results[0]._source;

    //better error handling?
    try {
      var state = updateURL.getState();
      state.visualizations[0].form = form;

      $scope.state = state.visualizations[0];
      $scope.state.options.labels.notes = atob($scope.state.options.labels.notes || '');
    }
    catch (err) {
      $scope.error = err.message;
    }
  });
};
