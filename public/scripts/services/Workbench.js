'use strict';

var angular = require('angular');

// TODO refactor, move to workbench/ dir
// @ngInject
module.exports = function ($resource, $modal, $state, WorkbenchResource, crud) {
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
        $state.go('workbench', {workbenchId: data._id});
      };

      crud.open(record, WorkbenchResource, require('../../partials/edit/forms/workbench-form.html'),
        {postSuccess: postSuccess});
    },
    update: function (state, workbenchId) {
      WorkbenchResource.update(angular.extend({id: workbenchId}, state), function () {
        $modal.open({
          template: require('../../workbench/workbench-saved-modal.html'),
          controller: /*ngInject*/ function ($scope, $modalInstance) {
            $scope.ok = function () {
              $modalInstance.dismiss('cancel');
            };
          }
        });
      });
    },
    updateName: function(workbenchId, newWorkbenchName, originalWorkbench) {
      /**
       * Server doesn't allow us to update a workbench name without updating the entire workbench definition,
       * so send the original (last saved) workbench definition along with the new name.
       */
      var newNameObj = { id: workbenchId, name: newWorkbenchName, state: originalWorkbench };
      WorkbenchResource.update(newNameObj);
    },
    get: function (id, callback) {
      WorkbenchResource.get({id: id}, callback);
    },
    openModal: function () {
      $modal.open({
        template: require('../../workbench/open-workbench-modal.html'),
        controller: /*ngInject*/ function ($scope, $modalInstance) {
          $scope.workbench = {};
          $scope.workbenches = [];
          WorkbenchResource.get(function (response) {
            $scope.workbenches = response.results;

            var defaultSelection = response.results[0];
            response.results.forEach(function (d) {
              if (d._source.name === 'default') {
                defaultSelection = d;
                return false;
              }
            });

            $scope.workbench.workbench = defaultSelection;
          });

          $scope.ok = function () {
            $modalInstance.close($scope.workbench.workbench);
          };

          $scope.cancel = function () {
            $modalInstance.dismiss('cancel');
          };
        }
      }).result.then(function (workbench) {
          return $state.go('workbench', {workbenchId: workbench._id});
        });
    }
  };
};
