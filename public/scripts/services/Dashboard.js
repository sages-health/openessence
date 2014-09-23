'use strict';

var angular = require('angular');

// TODO refactor, move to dashboard/ dir
// @ngInject
module.exports = function ($resource, $modal, $state, DashboardResource, crud) {
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
      var record = {_source: state};
      var postSuccess = function (data) {
        $state.go('dashboard', {dashboardId: data._id});
      };

      crud.open(record, DashboardResource, require('../../partials/edit/forms/dashboard-form.html'),
        {postSuccess: postSuccess});
    },
    update: function (state, dashboardId) {
      DashboardResource.update(angular.extend({id: dashboardId}, state), function () {
        $modal.open({
          template: require('../../dashboard/dashboard-saved-modal.html'),
          controller: /*ngInject*/ function ($scope, $modalInstance) {
            $scope.ok = function () {
              $modalInstance.dismiss('cancel');
            };
          }
        });
      });
    },
    get: function (id, callback) {
      DashboardResource.get({id: id}, callback);
    },

    openModal: function () {
      $modal.open({
        template: require('../../dashboard/open-dashboard-modal.html'),
        controller: /*ngInject*/ function ($scope, $modalInstance) {
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
        }
      }).result.then(function (dashboard) {
          return $state.go('dashboard', {dashboardId: dashboard._id});
        });
    }
  };
};
