'use strict';

var angular = require('angular');
var services = require('../modules').services;

angular.module(services.name).factory('Dashboard', function ($resource, $modal, DashboardResource) {

  return {
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
        template: require('../../partials/save-dashboard-modal.html'),
        controller: ['$scope', '$modalInstance', function ($scope, $modalInstance) {
          $scope.dashboard = {};
          $scope.save = function (form) {
            if (form.$invalid) {
              $scope.yellAtUser = true;
              return;
            }

            $modalInstance.close($scope.dashboard);
          };

          $scope.cancel = function () {
            $modalInstance.dismiss('cancel');
          };
        }]
      }).result.then(function (result) {
          DashboardResource.save(angular.extend({}, state, {
            name: result.name,
            description: result.description
          }));
        });
    },
    update: function (state, dashboardId) {
      DashboardResource.update(angular.extend({_id :dashboardId}, state), function(){
        $modal.open({
          template: require('../../partials/dashboard-saved-modal.html'),
          controller: ['$scope', '$modalInstance', function ($scope, $modalInstance) {
            $scope.ok = function () {
              $modalInstance.dismiss('cancel');
            };
          }]
        });
      });
    },
    get: function (id, callback) {
      DashboardResource.get({_id: id}, callback);
    }
  };
});
