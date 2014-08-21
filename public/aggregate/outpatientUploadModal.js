'use strict';

var angular = require('angular');
var services = require('../scripts/modules').services;

/**
 * Wraps outpatient upload page in a modal window.
 */
angular.module(services.name).factory('outpatientUploadModal', function ($modal) {
  return {
    open: function (options) {
      options = angular.extend({
        template: require('./../aggregate/modal-upload.html'),
        controller: ['$scope', '$modalInstance', function ($scope, $modalInstance) {

          $scope.preview = function () {
            // tell the form to save
            $scope.$broadcast('previewBulkData'); // "save" is a little too common for my comfort
          };

          // the save button on the modal
          $scope.save = function () {
            // tell the form to save
            $scope.$broadcast('bulkUpload'); // "save" is a little too common for my comfort
          };

          // the cancel button on the modal
          $scope.cancel = function () {
            $modalInstance.dismiss('cancel');
          };

          // called after the form has been successfully submitted to the server
          $scope.onSubmit = function () {
            $modalInstance.close();
          };
        }]
      }, options);

      return $modal.open(options);
    }
  };
});
