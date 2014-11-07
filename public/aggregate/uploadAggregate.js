'use strict';

var angular = require('angular');
var directives = require('../scripts/modules').directives;

/**
 * A reusable outpatient upload form.
 */
angular.module(directives.name).directive('aggregateUpload', /*@ngInject*/ function (gettextCatalog, OutpatientVisitResource,
                                                                       aggregateUtil, $rootScope) {
  return {
    restrict: 'E',
    template: require('./upload-aggregate.html'),
    transclude: true,
    scope: {
      onSubmit: '&',
      record: '=?' // to populate fields
    },
    compile: function () {
      return {
        pre: function (scope) {
          scope.data = {};
          scope.data.tableData = [];
          scope.data.tableParams = {};
          scope.uploading = false;
          $rootScope.$on('csvData', function () {
            scope.$apply(function () {
              scope.noData = !scope.data.tableData || scope.data.tableData.length === 0 ? true : null;
            });
          });

          scope.$on('bulkUpload', function () {
            scope.submit(scope.uploadAggregateForm);
          });

          scope.submit = function () {
            if (!scope.data.tableData || scope.data.tableData.length === 0) {
              scope.noData = true;
              return;
            }
            scope.noData = false;

            var updateProgress = function(){
              scope.done++;
              scope.progress = parseInt((100 * scope.done/scope.total), 10);
              if(scope.done === scope.total){
                scope.onSubmit(scope.uploadAggregateForm);
              }
            };

            var success = function () {
              updateProgress();
            };

            var failure = function () {
              updateProgress();
            };

            scope.done = 0;
            scope.total = scope.data.tableData.length;
            scope.uploading = true;
            scope.data.tableData.forEach(function (data) {
              if (data.visitDate) {
                var record = aggregateUtil.csvToAggregate(data);
                //TODO: bulk insert
                OutpatientVisitResource.save(record, success, failure);
              }
            });
          };
        }
      };
    }
  };
});
