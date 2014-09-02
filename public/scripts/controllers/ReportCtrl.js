'use strict';

// @ngInject
module.exports = function ($scope, $modal, $stateParams, $window) {
  $modal.open({
    template: require('../../partials/save-report-dialog.html'),
    controller: ['$scope', '$modalInstance', '$state', '$log', 'Report', 'urlToSave', function ($scope, $modalInstance, $state, $log, Report, urlToSave) {
      $scope.container = {}; // see https://github.com/angular-ui/bootstrap/issues/969
      $scope.ok = function () {
        $modalInstance.close();
        Report.update({
          name: $scope.container.report.name,
          url: urlToSave
        }).$promise
          .catch(function () {
            // TODO do something
            $log.error('Error saving report');
          })
          .finally(function () {
            $state.go('home.content');
          });
      };

      $scope.cancel = function () {
        $modalInstance.dismiss('cancel');
        $state.go('home.content');
      };
    }],
    scope: $scope,
    resolve: {
      'urlToSave': function () {
        return $window.decodeURIComponent($stateParams.url);
      }
    }
  });
};
