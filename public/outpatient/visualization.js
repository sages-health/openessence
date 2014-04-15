'use strict';

var angular = require('angular');
var directives = require('../scripts/modules').directives;

angular.module(directives.name).directive('outpatientVisualization', function ($http, gettextCatalog, sortString,
                                                                               FrableParams) {
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

        var query = function (params) { // TODO ngResource
          return $http.get('/resources/outpatient-visit',
            {
              params: params
            });
        };

        scope.tableParams = new FrableParams({
          page: 1,
          count: 10,
          sorting: {
            date: 'desc'
          }
        }, {
          total: 0,
          counts: [], // hide page count control
          $scope: {
            $data: {}
          },
          getData: function($defer, params) {
            query({
              q: scope.queryString,
              from: (params.page() - 1) * params.count(),
              size: params.count(),
              sort: sortString.toElasticsearchString(params.orderBy()[0]) // we only support one level of sorting
            }).success(function (data) {
              params.total(data.total);
              $defer.resolve(data.results.map(function (r) {
                return r._source;
              }));
            });
          }
        });

        scope.$watch('queryString', function () {
          if (scope.visualization.name === 'table') {
            scope.tableParams.reload();
          } else if (scope.visualization.name === 'crosstab') {
            // TODO make a pivot table with elasticsearch aggregations and set scope.tabularData
          }
        });
      }
    }
  };
});
