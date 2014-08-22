'use strict';

var angular = require('angular');
var services = require('../modules').services;

angular.module(services.name).factory('visualization', function ($resource, $modal, VisualizationResource) {
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
    }
  };
});
