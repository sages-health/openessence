'use strict';

var angular = require('angular');
var d3 = require('d3');
var directives = require('../scripts/modules').directives;

angular.module(directives.name).directive('outpatientVisualization', function ($http, $modal, orderByFilter, gettextCatalog, sortString, FrableParams, OutpatientVisit, outpatientEditModal, outpatientDeleteModal) {
  return {
    restrict: 'E',
    template: require('./visualization.html'),
    scope: {
      queryString: '=',
      close: '&onClose'
    },
    link: {
      // runs before nested directives, see http://stackoverflow.com/a/18491502
      pre: function (scope) {
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

        var aggregations = {
          sex: {
            terms: {
              field: 'patient.sex'
            }
          },
          age: {
            range: { // age is actually an age group, b/c that's almost always what you actually want
              field: 'patient.age',
              ranges: [
                {to: 1},
                {from: 1, to: 5},
                {from: 5, to: 12},
                {from: 12, to: 18},
                {from: 18, to: 45},
                {from: 45, to: 65},
                {from: 65}
              ]
            }
          }
        };

        // strings that we can't translate in the view, usually because they're in attributes
        scope.strings = {
          date: gettextCatalog.getString('Date'),
          sex: gettextCatalog.getString('Sex'),
          age: gettextCatalog.getString('Age'),
          symptoms: gettextCatalog.getString('Symptoms'),
          edit: gettextCatalog.getString('Edit')
        };

        var reload = function () {
          if (scope.visualization.name === 'table') {
            scope.tableParams.reload();
          } else if (scope.visualization.name === 'line') {
            var aggs = {};
            var dateAgg = {
              'date_histogram': {
                field: 'reportDate',
                interval: 'day', // TODO make this configurable and auto-select based on data
                'min_doc_count': 0, // distinguish between 0 and nulls
                'extended_bounds': { // include 0s that preceed start of data, see bit.ly/1fpqRAP
                  // TODO get date range
                  min: '2014-01-29',
                  max: '2014-04-29'
                }
              }
            };

            if (scope.pivot.cols.length > 0) {
              scope.pivot.cols.forEach(function (pivotCol) {
                aggs[pivotCol] = angular.copy(aggregations[pivotCol]);
                aggs[pivotCol].aggs = {
                  date: dateAgg
                };
              });
            } else {
              aggs.date = dateAgg;
            }

            var extractCounts = function (agg) {
              return agg.buckets.map(function (b) {
                /*jshint camelcase:false */
                return [b.key, b.doc_count];
              });
            };

            OutpatientVisit.search({
              q: scope.queryString,
              size: 0, // we only want aggregations
              aggs: aggs
            }, function (data) {
              if (data.aggregations.date) {
                scope.tsData = [
                  {
                    key: gettextCatalog.getString('Outpatient visits'),
                    values: extractCounts(data.aggregations.date)
                  }
                ];
              } else {
                scope.tsData = [];
                Object.keys(data.aggregations).forEach(function (agg) {
                  // agg === 'sex', e.g.
                  data.aggregations[agg].buckets.map(function (b) {
                    var key = b.key; // TODO put this in an aggregation service
                    if (!key) {
                      if (b.from && b.to) {
                        key = b.from + '-' + b.to;
                      } else if (b.from) {
                        key = '>' + b.from;
                      } else if (b.to) {
                        key = '<' + b.to;
                      }
                    }
                    scope.tsData.push({
                      key: key,
                      values: extractCounts(b.date)
                    });
                  });
                });
              }
            });
          }
        };

        scope.editVisit = function (record) {
          outpatientEditModal.open({
            record: record
          })
            .result
            .then(function () {
              reload(); // TODO highlight changed record
            });
        };
        scope.deleteVisit = function (record) {
          outpatientDeleteModal.open({record: record})
            .result
            .then(function () {
              reload();
            });
        };

        scope.tableParams = new FrableParams({
          page: 1,
          count: 10,
          sorting: {
            reportDate: 'desc'
          }
        }, {
          total: 0,
          counts: [], // hide page count control
          $scope: {
            $data: {}
          },
          getData: function ($defer, params) {
            if (!angular.isDefined(scope.queryString)) {
              // Wait for queryString to be set before we accidentally fetch a bajillion rows we don't need.
              // If you really don't want a filter, set queryString='' or null
              // TODO there's probably a more Angular-y way to do this
              $defer.resolve([]);
              return;
            }

            OutpatientVisit.get({
              q: scope.queryString,
              from: (params.page() - 1) * params.count(),
              size: params.count(),
              sort: sortString.toElasticsearchString(params.orderBy()[0]) // we only support one level of sorting
            }, function (data) {
              params.total(data.total);
              $defer.resolve(data.results);
            });
          }
        });

        scope.$watch('queryString', function () {
          reload();
        });

        scope.xAxisTickFormat = function (d) {
          return d3.time.format('%Y-%m-%d')(new Date(d));
        };

        scope.$watchCollection('[visualization.name, pivot.rows, pivot.cols]', function (collection) {
          if (collection[0] === 'line') {
            reload();
          }
        });
      }
    }
  };
});
