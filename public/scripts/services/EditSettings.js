'use strict';

var angular = require('angular');

// @ngInject
module.exports = function ($resource, $modal) {
  return {
    openSettingsModal: function (vizType, labels) {
      return $modal.open({
        template: require('../../partials/edit-settings-modal.html'),
        controller: /*ngInject*/ function ($scope, $modalInstance) {
          $scope.vizType = vizType;
          $scope.labels = angular.copy(labels);


          $scope.ok = function () {
            $modalInstance.close($scope.labels);
          };

          $scope.cancel = function () {
            $modalInstance.dismiss('cancel');
          };
        }
      });

    }
  };
};
