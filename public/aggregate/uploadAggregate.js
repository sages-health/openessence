'use strict';

var angular = require('angular');
var directives = require('../scripts/modules').directives;

/**
 * A reusable outpatient upload form.
 */
angular.module(directives.name).directive('aggregateUpload', function (gettextCatalog, OutpatientVisitResource,//
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

            var cleanup = function () {
              scope.noData = false;
              scope.onSubmit(scope.uploadAggregateForm);
            };

            scope.data.tableData.forEach(function (data) {
              if (data.reportDate) {
                var record = aggregateUtil.csvToAggregate(data);
                //TODO: bulk insert
                OutpatientVisitResource.save(record, cleanup);
              }
            });
          };
        }
      };
    }
  };
});
