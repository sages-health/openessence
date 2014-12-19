'use strict';

var angular = require('angular');

// @ngInject
module.exports = function ($modal) {
  return {
    openWeeklyReport: function (options) {
      options = angular.extend({
        template: require('../../../partials/reports/open-weekly-report-dialog.html'),
        controller: /*@ngInject*/ function ($scope, $modalInstance, $window, gettextCatalog) {
          $scope.report = {};
          $scope.report.name = gettextCatalog.getString('Reported Cases by Country - Weekly Report');
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

            if (form.$invalid) {
              $scope.yellAtUser = true;
              return;
            }
            var url = document.baseURI;
            url = url + 'weekly-report?params=' + btoa(JSON.stringify($scope.report));
            $window.open(url, 'report-weekly', 'width=1280,resizable=1,scrollbars=1,toolbar=1');

            $modalInstance.close();
          };

          $scope.cancel = function () {
            $modalInstance.dismiss('cancel');
          };
        }
      }, options);

      return $modal.open(options);
    },
    openTimeseriesReport: function (options) {
      options = angular.extend({
        template: require('../../../partials/reports/open-timeseries-report-dialog.html'),
        controller: /*@ngInject*/ function ($scope, $modalInstance, $window, gettextCatalog) {
          $scope.report = {};
          $scope.report.name = gettextCatalog.getString('Reported Cases by Country - Time Series');
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

            if (form.$invalid) {
              $scope.yellAtUser = true;
              return;
            }
            var url = document.baseURI;
            url = url + 'timeseries-report?params=' + btoa(JSON.stringify($scope.report));
            $window.open(url, 'report-timeseries', 'width=1280,resizable=1,scrollbars=1,toolbar=1');

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
