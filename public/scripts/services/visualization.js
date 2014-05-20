'use strict';

var angular = require('angular');
var services = require('../modules').services;

angular.module(services.name).factory('visualization', function ($resource, $modal) {
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
    resource: Visualization,
    state: function (scope) {
      return Object.keys(scope).reduce(function (prev, current) {
        if (!/^\$/.test(current) && current !== 'this' && !angular.isFunction(scope[current])) {
          prev[current] = scope[current];
        }
        return prev;
      }, {});
    },

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
          new Visualization(angular.extend({}, state, {
            name: name
          }))
            .$save();
        });
    }
  };
});
