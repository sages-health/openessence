'use strict';

var angular = require('angular');
var services = require('../modules').services;

// TODO refactor, move to dashboard/ dir
angular.module(services.name).factory('Dashboard', function ($resource, $modal, $state, DashboardResource) {

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
        template: require('../../dashboard/save-dashboard-modal.html'),
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
          template: require('../../dashboard/dashboard-saved-modal.html'),
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
    },

    openModal: function () {
      $modal.open({
        template: require('../../dashboard/open-dashboard-modal.html'),
        controller: ['$scope', '$modalInstance', function ($scope, $modalInstance) {
          $scope.dashboard = {};
          $scope.dashboards = [];
          DashboardResource.get(function (response) {
            $scope.dashboards = response.results;

            var defaultSelection = response.results[0];
            response.results.forEach(function (d) {
              if (d._source.name === 'default') {
                defaultSelection = d;
                return false;
              }
            });

            $scope.dashboard.dashboard = defaultSelection;
          });

          $scope.ok = function () {
            $modalInstance.close($scope.dashboard.dashboard);
          };

          $scope.cancel = function () {
            $modalInstance.dismiss('cancel');
          };
        }]
      }).result.then(function (dashboard) {
          return $state.go('dashboard', {dashboardId: dashboard._id});
        });
    }
  };
});
