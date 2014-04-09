'use strict';

var angular = require('angular');
var directives = require('../scripts/modules').directives;

angular.module(directives.name).directive('outpatientVisualization', function ($http, gettextCatalog, orderByFilter,
                                                                               FrableParams) {
  return {
    restrict: 'E',
    template: require('./visualization.html'),
    scope: {
      filters: '=',
      records: '=?'
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

        $http.get('/resources/outpatient-visit?size=500').success(function (rawData) {
          // TODO we need a real filter service like Kibana has
          // https://github.com/elasticsearch/kibana/blob/master/src/app/services/filterSrv.js
          var filterRawData = function () {
            return rawData.results
              .map(function (r) {
                return r._source;
              })
              .filter(function (row) {

                // nested comparison, based on https://github.com/angular/angular.js/pull/6215
                var compare = function (expected, actual) {
                  if (expected === '') { // when filter not selected
                    // TODO sometimes we do want to search for the empty string
                    return true;
                  }

                  if (typeof expected === 'object') {
                    if (typeof actual !== 'object') {
                      return false;
                    }

                    for (var key in expected) {
                      if (expected.hasOwnProperty(key)) {
                        if (!compare(expected[key], actual[key])) {
                          return false;
                        }
                      }
                    }

                    return true;
                  }

                  return angular.equals(expected, actual);
                };

                // for each row, make sure every filter matches
                return Object.keys(scope.filters).every(function (filter) {
                  var expected = {};
                  expected[filter] = scope.filters[filter];
                  return compare(expected, row);
                });
              });
          };

          scope.records = filterRawData();

          scope.$watch('filters', function () {
            scope.records = filterRawData();
          }, true);
        });
      }
    }
  };
});
