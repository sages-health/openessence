'use strict';

var angular = require('angular');
var services = require('../scripts/modules').services;

angular.module(services.name).factory('outpatientImportModal', /*@ngInject*/ function ($modal, $rootScope, aggregateUtil) {
  return {
    // Create or edit a record. If record is null, a new record will be created
    open: function (record, resource, template, options) {
      return $modal.open({
        template: require('./modal-upload.html'),
        controller: ['$scope', '$modalInstance', function ($scope, $modalInstance) {
          $scope.uniqueConstraintViolation = false;
          $scope.record = record || {};
          $scope.data = angular.copy($scope.record._source) || {};
          $scope.yellAtUser = false;
          $scope.page = 1;
          $scope.allowUpload = true;
          $scope.next = function (recordForm) {
            $scope.yellAtUser = !!recordForm.$invalid;
            if (!$scope.yellAtUser) {
              $scope.page++;
            }
          };
          $scope.previous = function () {
            $scope.page--;
          };
          $scope.csv = {
            tableData: [],
            fileParams: {}
          };
          $scope.fileNotSelectedError = true;

          $rootScope.$on('csvData', function () {
            $scope.$apply(function () {
              if ($scope.csv.tableData && $scope.csv.tableData.length > 0) {
                $scope.data = aggregateUtil.csvToAggregate($scope.csv.tableData[0]);
              }
              else {
                $scope.data = {};
              }
              $scope.noData = !$scope.csv.tableData || $scope.csv.tableData.length === 0 ? true : null;
            });
          });
          angular.extend($scope, options);

          $scope.isInvalid = function (field) { // TODO move to parent controller
            if ($scope.yellAtUser) {
              // if the user has already tried to submit, show them all the fields they're required to submit
              return field.$invalid;
            } else {
              // only show a field's error message if the user has already interacted with it, this prevents a ton of red
              // before the user has even interacted with the form
              return field.$invalid && !field.$pristine;
            }
          };

          $scope.submit = function (form) {
            if (form.$invalid) {
              $scope.yellAtUser = true;
              return;
            }

            var cleanup = function (data) {
              $scope.yellAtUser = false;
              $scope.success = true;
              $modalInstance.close(data);
              if ($scope.postSuccess) {
                $scope.postSuccess(data);
              }
            };

            var showError = function (data) {
              if (data.status === 409) {
                // Get latest record data and update form
                resource.get({id: $scope.record._id}, function (newData) {
                  $scope.conflictError = true;
                  $scope.record = newData;
                  $scope.data = newData._source;
                });
              } else if (data.data && data.data.error && data.data.error === 'UniqueConstraintViolation') {
                $scope.uniqueConstraintViolation = true;
              }
            };

            var data = $scope.data;
            if ($scope.dataCleanup) {
              data = $scope.dataCleanup($scope.data);
            }
            if ($scope.record._id || $scope.record._id === 0) { // TODO move this logic to resource
              resource.update({
                id: $scope.record._id,
                version: $scope.record._version
              }, data, cleanup, showError);
            } else {
              resource.save(data, cleanup, showError);
            }
          };

          $scope.cancel = function () {
            $modalInstance.dismiss('cancel');
          };
        }]
      });
    }
  };
});
