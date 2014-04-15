'use strict';

var angular = require('angular');
var directives = require('../scripts/modules').directives;

angular.module(directives.name).directive('outpatientVisualization', function ($http, gettextCatalog,
                                                                               orderByFilter, FrableParams) {
  return {
    restrict: 'E',
    template: require('./visualization.html'),
    scope: {
      queryString: '=',
      records: '=?',
      close: '&onClose'
    },
    link: {
      // runs before nested directives, see http://stackoverflow.com/a/18491502
      pre: function (scope) {
        scope.records = scope.records || [];
        scope.visualization = {
          name: 'table'
        };

        scope.pivot = {
          rows: [],
          cols: []
        };
        scope.pivotOptions = [
          {
            value: 'sex',
            label: gettextCatalog.getString('Sex')
          },
          {
            value: 'age',
            label: gettextCatalog.getString('Age')
          }
        ];

        // strings that we can't translate in the view, usually because they're in attributes
        scope.strings = {
          date: gettextCatalog.getString('Date'),
          sex: gettextCatalog.getString('Sex'),
          age: gettextCatalog.getString('Age'),
          symptoms: gettextCatalog.getString('Symptoms')
        };

        scope.tableParams = new FrableParams({
          page: 1,
          count: 10,
          sorting: {
            date: 'desc'
          }
        }, {
          total: function () {
            return scope.records.length;
          },
          counts: [], // hide page count control
          $scope: {
            $data: {}
          },
          getData: function($defer, params) {
            var orderData = orderByFilter(scope.records, params.orderBy());
            $defer.resolve(orderData.slice((params.page() - 1) * params.count(), params.page() * params.count()));
          }
        });

        scope.$watch('records', function (data) {
          if (!data) {
            scope.tabularData = null;
          } else {
            scope.tabularData = data.map(function (row) {
              return {
                reportDate: row.reportDate,
                sex: row.patient ? row.patient.sex : null,
                age: row.patient ? row.patient.age : null
              };
            });
          }

          scope.tableParams.reload();
        }); // we always update the entire array reference, so no need for deep equality

        scope.query = function (queryString) {
          $http.get('/resources/outpatient-visit',
            {
              params: {
                size: 500, // TODO paging in grid
                q: queryString
              }
            })
            .success(function (rawData) {
              scope.records = rawData.results.map(function (r) {
                return r._source;
              });
            });
        };

        scope.$watch('queryString', function (queryString) {
          scope.query(queryString);
        });
      }
    }
  };
});
