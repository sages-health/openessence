'use strict';

var angular = require('angular');
var services = require('../modules').services;

angular.module(services.name).factory('visualization', function ($resource, $modal, scopeToJson) {
  var Visualization = $resource('/resources/visualization/:_id',
    {
      _id: '@_id'
    },
    {
      update: {
        method: 'PUT'
      }
    });

  return {
    // TODO move this to services/resources
    resource: Visualization,

    state: scopeToJson, // useful abstraction in case we need to introduce custom logic into saving visualizations

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
          new Visualization({
            name: name,
            state: state
          })
            .$save();
        });
    }
  };
});
