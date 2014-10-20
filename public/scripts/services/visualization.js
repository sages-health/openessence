'use strict';

var angular = require('angular');

// @ngInject
module.exports = function ($resource, $modal, $window, $location, VisualizationResource) {
  return {
    // TODO make clients use this directly
    resource: VisualizationResource,
    save: function (state) {
      $modal.open({
        template: require('../../partials/save-visualization-modal.html'),
        controller: ['$scope', '$modalInstance', function ($scope, $modalInstance) {
          $scope.viz = {};
          $scope.save = function (form) {
            if (form.$invalid) {
              $scope.yellAtUser = true;
              return;
            }

            $modalInstance.close($scope.viz.name);
          };

          $scope.cancel = function () {
            $modalInstance.dismiss('cancel');
          };
        }]
      })
        .result
        .then(function (name) {
          new VisualizationResource({
            name: name,
            state: state
          })
            .$save();
        });
    },
    export: function (state) {

      $window.state = angular.copy(state);
      //var url = $window.location.protocol + '//' + $window.location.host + $window.location.pathname;
      var url = document.baseURI;
      url = url + 'visualization-export';

      $window.open(url, 'visualizationExport', 'width=1200,resizable=1,scrollbars=1,toolbar=0,location=0,menubar=0,titlebar=0');
    },
    exportOld: function (state) {

      //TODO: based on visualization type, use different modal
      // i.e. time series may have x/y axis config
      var template = require('../../partials/export-visualization-modal.html');

      $modal.open({
        backdrop: 'static',
        size: 'lg',
        state: state,
        template: template,
        controller: ['$scope', '$modalInstance', function ($scope, $modalInstance) {
          $scope.viz = {};
          $scope.state = state;
          $scope.visualization = state.visualization;
          $scope.pivot = state.pivot
          $scope.queryString = state.queryString;
          $scope.filters = state.filters;
          $scope.options = state.options;

          $scope.save = function (form) {
            if (form.$invalid) {
              $scope.yellAtUser = true;
              return;
            }

            $modalInstance.close($scope.viz.name);
          };

          $scope.cancel = function () {
            $modalInstance.dismiss('cancel');
          };
        }]
      })
        .result
        .then(function (name) {
//          new VisualizationResource({
//            name: name,
//            state: state
//          })
//            .$save();
        });
    }
  };
};
