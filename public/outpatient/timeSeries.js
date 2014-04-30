'use strict';

var angular = require('angular');
var d3 = require('d3');
var directives = require('../scripts/modules').directives;

angular.module(directives.name).directive('outpatientTimeSeries', function (gettextCatalog, outpatientAggregation,
                                                                            OutpatientVisit) {
  return {
    restrict: 'E',
    template: require('./time-series.html'),
    scope: {
      queryString: '=',
      series: '=?' // array of strings denoting series to graph
    },
    compile: function () {
      return {
        pre: function (scope) {
          scope.series = scope.series || [];

          scope.xAxisTickFormat = function (d) {
            return d3.time.format('%Y-%m-%d')(new Date(d));
          };

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

          var extractCounts = function (agg) {
            return agg.buckets.map(function (b) {
              /*jshint camelcase:false */
              return [b.key, b.doc_count];
            });
          };

          var reload = function () {
            var aggs = {};
            if (scope.series.length > 0) {
              scope.series.forEach(function (s) {
                aggs[s] = outpatientAggregation.getAggregation(s);
                aggs[s].aggs = {
                  date: dateAgg
                };
              });
            } else {
              aggs.date = dateAgg;
            }

            OutpatientVisit.search({
              q: scope.queryString,
              size: 0, // we only want aggregations
              aggs: aggs
            }, function (data) {
              if (data.aggregations.date) {
                scope.data = [
                  {
                    key: gettextCatalog.getString('Outpatient visits'),
                    values: extractCounts(data.aggregations.date)
                  }
                ];
              } else {
                scope.data = [];
                Object.keys(data.aggregations).forEach(function (agg) {
                  // agg === 'sex', e.g.
                  data.aggregations[agg].buckets.map(function (b) {
                    scope.data.push({
                      key: outpatientAggregation.bucketToKey(b),
                      values: extractCounts(b.date)
                    });
                  });
                });
              }
            });
          };

          scope.$watchCollection('series', function () {
            reload();
          });

          scope.$watch('queryString', function () {
            reload();
          });
        }
      };
    }
  };
});
