'use strict';
var angular = require('angular');
var services = require('../scripts/modules').services;
var flat = require('flat');

angular.module(services.name).factory('outpatientCsvImportModal', /*@ngInject*/ function ($modal, OutpatientVisitResource, csvUtil) {
  return {
    open: function (scope, modalOptions) { // TODO fix all usages of this
      modalOptions = angular.extend({
        template: require('./modal-import.html'),
        controller: /*@ngInject*/ function ($scope, $modalInstance) {
          angular.extend($scope, {
            data: {
              tableData: [],
              tableParams: {},
              uploading: false
            }
          }, scope);

          // the save button on the modal
          $scope.save = function () {
            if (!$scope.data.tableData || $scope.data.tableData.length === 0) {
              $scope.noData = true;
              return;
            }
            $scope.noData = false;

            var updateProgress = function () {
              $scope.done++;
              $scope.progress = parseInt((100 * $scope.done / $scope.total), 10);
              if ($scope.done === $scope.total) {
                $scope.importCompleted = true;
              }
            };
            var onSuccess = function () {
              $scope.goodRecCount++;
              updateProgress();
            };

            var onError = function (response) {
              addColumns(response.config.data);
              $scope.badRecs.push(response.config.data);
              $scope.badRecCount++;
              updateProgress();
            };

            var addColumns = function (rec) {
              var flatRec = flat.flat(rec);
              var props = Object.keys(flatRec);
              if (props && props.length > 0) {
                props.forEach(function (prop) {
                  if ($scope.badRecsColumnNames.indexOf(prop) === -1) {
                    $scope.badRecsColumnNames.push(prop);
                    $scope.badRecsColumnDefs.push({field: prop, width: '100'});
                  }
                });
              }
            };

            $scope.badRecGridOptions = {
              data: 'badRecs',
              enableColumnResize: true,
              multiSelect: false,
              columnDefs: 'badRecsColumnDefs',
              init: function (grid, $scope) {
                setTimeout(function () {
                  // rebuild grid to avoid grid width over flow while resetting columnDefs
                  $scope.badRecGridOptions.$gridServices.DomUtilityService.RebuildGrid(
                    $scope.badRecGridOptions.$gridScope, $scope.badRecGridOptions.ngGrid);
                }, 1000);
              }
            };

            $scope.importCompleted = false;
            $scope.badRecs = [];
            $scope.badRecsColumnDefs = [];
            $scope.badRecsColumnNames = [];
            $scope.done = 0;
            $scope.badRecCount = 0;
            $scope.goodRecCount = 0;
            $scope.total = $scope.data.tableData.length;
            $scope.uploading = true;
            $scope.data.tableData.forEach(function (row) {
              if (row.visitDate) {
                // csvUtil will process one record at a time, remove id prop if it is there
                // format dates, int, double, array, etc...
                var record = csvUtil.toRecord(row);
                //TODO: bulk insert
                // Ignore ids, always insert record. Once we expand our GUI, we may prove option to insert/update
                OutpatientVisitResource.save(record, onSuccess, onError);

              }
            });
          };

          // the cancel button on the modal
          $scope.cancel = function () {
            $modalInstance.dismiss('cancel');
          };

          // called after the form has been successfully submitted to the server
          $scope.submit = function () {
            $modalInstance.close();
          };

        }
      }, modalOptions);

      return $modal.open(modalOptions);
    }
  };
});
