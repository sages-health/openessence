'use strict';

var angular = require('angular');

// @ngInject
module.exports = function ($modal) {
  return {
    open: function (options) {
      options = angular.extend({
        template: require('../../../partials/reports/open-visits-report-dialog.html'),
        controller: /*@ngInject*/ function ($scope, $modalInstance, $window) {
          $scope.report = {};

          $scope.isInvalid = function (field) {
            if ($scope.yellAtUser) {
              // if the user has already tried to submit, show them all the fields they're required to submit
              return field.$invalid;
            } else {
              // only show a field's error message if the user has already interacted with it, this prevents a ton of
              // red before the user has even interacted with the form
              return field.$invalid && !field.$pristine;
            }
          };
          $scope.open = function (form) {
            $scope.yellAtUser = false;
            $scope.invalidDateRange = false;

            if (form.$invalid) {
              $scope.yellAtUser = true;
              return;
            }
            if ($scope.report.startDate > $scope.report.endDate) {
              $scope.invalidDateRange = true;
              return;
            }
            $window.report = $scope.report;

            var url = $window.location.protocol + '//' + $window.location.host + $window.location.pathname;
            url = url + 'visits-report';

            $window.open(url, 'report-visits', 'width=1280,resizable=1,scrollbars=1,toolbar=1');

            $modalInstance.close();
          };

          $scope.cancel = function () {
            $modalInstance.dismiss('cancel');
          };
        }
      }, options);

      return $modal.open(options);
    }
  };
};
