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
      filters: '=',
      series: '=?' // array of strings denoting series to graph
    },
    compile: function () {
      return {
        pre: function (scope) {
          scope.series = scope.series || [];

          scope.xAxisTickFormat = function (d) {
            return d3.time.format('%Y-%m-%d')(new Date(d));
          };

          scope.interval = 'day'; // TODO auto-select based on date range

          // TODO zoom in via brush control, see http://bl.ocks.org/mbostock/1667367

          /**
           *
           * @param factor zoom factor, 0.5 would cut timespan in half (zoom in), 2 would double timespan (zoom out)
           */
          scope.zoom = function (factor) {
            if (factor === 1) {
              // I wonder if this is even worth checking for
              return;
            }

            var dateFilters = scope.filters.filter(function (f) {
              return f.type === 'date';
            });

            var dateFilter;
            if (dateFilters.length === 0) {
              // TODO add new date filter
            } else {
              dateFilter = dateFilters[0];
            }

            // adapted from Kibana's algorithm,
            // see https://github.com/elasticsearch/kibana/blob/70ad6e27c137bf8f376e233d40c0c11385647625/src/app/panels/histogram/module.js#L510
            var timespan = dateFilter.to.getTime() - dateFilter.from.getTime();
            // TODO use endpoints of data instead, since they can't be undefined
            // TODO no way to get tick values from SVG we should just use d3 directly

            var center = dateFilter.to.getTime() - timespan / 2;
            var to = center + timespan * factor / 2;
            var from = center - timespan * factor / 2;

            // don't look into the future unless we already are
            if (to > Date.now() && dateFilter.to < Date.now()) {
              from = from - (to - Date.now());
              to = Date.now();
            }

            // When we first create a time series, it's OK if the x-axis limits are defined by the data, e.g. you
            // may run a query over a 90-day range, but only get back data in a 45-day interval. d3 adjusts the graph
            // accordingly, which is what you probably want to save space. But that auto-adjustment can be jarring
            // when you zoom out, e.g. the graph might not change at all if you zoom out and there's no new data to
            // show
            // FIXME this doesn't work, we'll probably have to use d3 directly
            scope.forceX = [from, to];

            if (factor > 1) {
              // replace existing date filter when we zoom out, action can be reversed by zooming in
              dateFilter.from = new Date(from);
              dateFilter.to = new Date(to);
            } else {
              // add a new filter we we zoom in, action can be reversed by deleting this new filter
              scope.filters.push({
                type: 'date',
                from: new Date(from),
                to: new Date(to)
              }); // TODO filter panel needs to watch for changes to filters
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
            var dateAgg = {
              'date_histogram': {
                field: 'reportDate',
                interval: scope.interval
              }
            };

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

          scope.$watchCollection('[series, queryString, interval]', function () {
            reload();
          });
        }
      };
    }
  };
});
