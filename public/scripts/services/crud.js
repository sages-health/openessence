'use strict';

var angular = require('angular');

// @ngInject
module.exports = function ($modal) {
  return {
    // Create or edit a record. If record is null, a new record will be created
    open: function (record, resource, template, options) {
      return $modal.open({
        template: template,
        controller: /*ngInject*/ function ($scope, $modalInstance) {
          $scope.uniqueConstraintViolation = false;
          $scope.record = record || {};
          $scope.data = angular.copy($scope.record._source) || {};
          $scope.yellAtUser = false;
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
              if($scope.postSuccess){
                $scope.postSuccess(data);
              }
            };

            var showError = function (data) {
              if (data.status === 409) {
                // Get latest record data and update form
                resource.get({_id: $scope.record._id}, function (newData) {
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
                _id: $scope.record._id,
                version: $scope.record._version
              }, data, cleanup, showError);
            } else {
              resource.save(data, cleanup, showError);
            }
          };

          $scope.cancel = function () {
            $modalInstance.dismiss('cancel');
          };
        }
      });
    },
    // Delete a record
    'delete': function (record, resource, template) {
      return $modal.open({
        template: template,
        controller: /*ngInject*/ function ($scope, $modalInstance) {
          $scope.record  = record;
          $scope.delete = function () {
            resource.remove({_id: record._id}, function () {
              $modalInstance.close(record);
            });
          };
          $scope.cancel = function () {
            $modalInstance.dismiss('cancel');
          };
        }
      });
    }
  };
};
