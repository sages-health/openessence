'use strict';

var angular = require('angular');
var moment = require('moment');
var _ = require('lodash');
var directives = require('../scripts/modules').directives;

angular.module(directives.name).directive('outpatientYearOverYear', /*@ngInject*/ function ($timeout, $window, $location, debounce,
                                                                                            updateURL, gettextCatalog,
                                                                                            outpatientAggregation,
                                                                                            visualization,
                                                                                            OutpatientVisitResource,
                                                                                            scopeToJson, EditSettings, $http) {

  return {
    restrict: 'E',
    template: require('./year-over-year.html'),
    scope: {
      options: '=?',
      height: '=?',
      width: '=?',
      queryString: '=',
      filters: '=',
      pivot: '=?', //updated to take both pivot cols/rows
      series: '=?', // array of strings denoting series to graph
      source: '=?',
      widget: '=?'
    },
    compile: function () {
      return {
        pre: function (scope, element, attrs) {

          var defaultLabels = {
            title: gettextCatalog.getString('Year Over Year'),
            y: gettextCatalog.getString('Count'),
            x: gettextCatalog.getString('Date')
          };

          scope.colors = Highcharts.getOptions().colors;

          scope.options = scope.options || {};
          scope.options.labels = scope.options.labels || defaultLabels;
          scope.series = scope.pivot.rows || scope.options.series || [];
          if (scope.options.interval) {
            scope.interval = scope.options.interval;
          }
          else {
            scope.interval = 'day';
            scope.options.interval = 'day';
          }
          if (scope.options.range) {
            scope.range = scope.options.range
          }
          else {
            scope.range = 1;
            scope.options.range = 1;
          }
          scope.refresh = false;

          scope.chartConfig = {
            options: {
              chart: {
                type: 'line',
                zoomType: 'x',
                resetZoomButton: {
                  theme: {
                    display: 'none'
                  }
                },
                events: {
                  selection: function (event) {
                    if (event.xAxis) {
                      var xMin = event.xAxis[0].min;
                      var xMax = event.xAxis[0].max;
                      scope.zoomWithRange(xMin, xMax);
                    }
                  }
                },
                animation: false
              },
              credits: {
                enabled: false
              },
              exporting: {enabled: false},
              plotOptions: {
                series: {
                  states: {
                    hover: {
                      halo: false
                    }
                  },
                  animation: false
                },
                line: {
                  events: {}
                }
              },
              events: {},
              tooltip: {
                shared: true,
                crosshairs: [{
                               width: 1.5,
                               dashStyle: 'solid',
                               color: 'black'
                             }, false],
                dateTimeLabelFormats: {
                  millisecond: "%B %e",
                  second: "%B %e",
                  minute: "%B %e",
                  hour: "%B %e",
                  day: "%B %e",
                  week: "%B %e",
                  month: "%B %e",
                  year: "%B %e"
                }
              }
            },
            xAxis: {
              ordinal: false,
              type: 'datetime',
              title: {
                text: scope.options.labels.x
              },
              dateTimeLabelFormats: {
                day: '%Y-%m-%d',
                month: '%Y-%m-%d',
                year: '%Y-%m-%d',
                week: '%Y-%m-%d'
              },
              minTickInterval: 86400000,
              gridLineWidth: 1
            },
            yAxis: {
              allowDecimals: false,
              min: 0,
              tickPixelInterval: 10,
              title: {
                text: scope.options.labels.y
              },
              tickLength: 5,
              lineWidth: 1
            },
            title: {
              text: scope.options.labels.title
            },
            series: [],
            loading: false,
            size: {
              width: scope.options.width - 10,
              height: scope.options.height - 40
            }
          };

          // Removing click functionality for clickthrough.
          if (scope.source === 'dashboard') {
            scope.chartConfig.options.chart.zoomType = null;
            scope.chartConfig.options.chart.events.click =
              function () {
                var savedWidget = {};
                savedWidget[scope.widget.name] = scope.widget.content;
                sessionStorage.setItem('visualization', JSON.stringify(savedWidget));
                scope.$apply(function () {
                  $location.path('/workbench/').search('visualization', scope.widget.name);
                });
              };
          }

          scope.$on('editVisualizationSettings', function () {
            EditSettings.openSettingsModal('timeseries', scope.options.labels)
              .result.then(function (labels) {
                scope.options.labels = labels;
                scope.chartConfig.yAxis.title.text = scope.options.labels.y;
                scope.chartConfig.xAxis.title.text = scope.options.labels.x;
                scope.chartConfig.title.text = scope.options.labels.title;
              });
          });

          scope.$on('exportVisualization', function () {
            visualization.export(angular.extend({}, scopeToJson(scope), {
              visualization: {
                name: 'line'
              },
              pivot: {
                cols: scope.series
              },
              source: 'export'
            }));
          });

          scope.$on('saveVisualization', function () {
            visualization.save(angular.extend({}, scopeToJson(scope), {
              visualization: {
                name: 'line'
              },
              pivot: {
                cols: scope.series
              }
            }));
          });

          var sumBucket = function (bucket) {
            if (!bucket) {
              return 0;
            }
            var sum = bucket.reduce(function (prev, curr) {
              var val = curr.count ? curr.count.value : curr.doc_count;
              return prev + val;
            }, 0);  //TODO make sure starting with 0 doesn't add data to normally empty values
            return sum;
          };

          var reload = function () {
            debounce(reloadDebounce, 1000).call();
          };

          var reloadDebounce = function () {

            scope.series = scope.pivot.rows || scope.options.series || [];
            var aggs = {};
            var dateAgg = {
              'date_histogram': {
                field: 'visitDate',
                interval: scope.interval,
                'min_doc_count': 0
              }
            };
            aggs.date = dateAgg;

            if (scope.series.length > 0) {
              aggs.date.aggs = {};
              scope.series.forEach(function (s) {
                var query = outpatientAggregation.buildAggregationQuery([s], scope.pivot.cols || [], null, scope.form);
                aggs.date.aggs[s] = query.query.first;
              });
            } else {
              if (scope.pivot.cols.length > 0) {
                aggs.date.aggs = {};
                var query = outpatientAggregation.buildAggregationQuery([], scope.pivot.cols, null, scope.form);
                aggs.date.aggs.second = query.query.first;
              } else {
              }
            }

            OutpatientVisitResource.search({
                q: scope.queryString,
                size: 0, // we only want aggregations
                aggs: aggs
              },
              function (data) {
                if (data.aggregations.date) {
                  scope.data = [];
                  var dataStore = {};
                  var ser = scope.series ? angular.copy(scope.series) : [];
                  if (ser.length < 1 && scope.pivot.cols.length > 0) {
                    ser.push('second');
                  }

                  if (ser.length > 0) {
                    data.aggregations.date.buckets.map(function (d) {
                      ser.forEach(function (s) {
                        var buk = d[s].buckets || d[s]._name.buckets;
                        buk = outpatientAggregation.toArray(buk);

                        if (s === 'second') {
                          var count = sumBucket(buk);
                          var label = gettextCatalog.getString('Outpatient visits');
                          if (!dataStore[label]) {
                            dataStore[label] = [];
                          }
                          dataStore[label].push({x: d.key, y: count});
                        } else {
                          buk.map(function (entry) {

                            if (plotSeries(entry.key, s)) {
                              var count = entry.count ? entry.count.value : entry.doc_count;
                              if (entry.second && entry.second._name) {
                                count = sumBucket(entry.second._name.buckets);
                              }
                              if (!dataStore[entry.key]) {
                                dataStore[entry.key] = [];
                              }
                              dataStore[entry.key].push({x: d.key, y: count});
                            }
                          });
                        }
                      });
                    });

                  } else {
                    var counts = extractCounts(data.aggregations.date, null, null);
                    dataStore[gettextCatalog.getString('Outpatient visits')] = counts;
                  }
                }

                var i = 0;
                angular.forEach(dataStore, function (points, key) {
                  scope.data.push({
                    name: key,
                    data: points,
                    id: 'current - ' + i
                  });
                  i++;
                });

                if (scope.options.range) {
                  scope.range = scope.options.range
                }
                else {
                  scope.range = 1;
                  scope.options.range = 1;
                }
                var loopRange = scope.range;

                getPreviousYears(loopRange, scope.filters[0].from, scope.filters[0].to)

              });
          };

          var getPreviousYears = function (years, startDate, endDate) {

            if (years > 0) {

              scope.series = scope.pivot.rows || scope.options.series || [];
              var aggs = {};
              var dateAgg = {
                'date_histogram': {
                  field: 'visitDate',
                  interval: scope.interval,
                  'min_doc_count': 0
                }
              };
              aggs.date = dateAgg;

              if (scope.series.length > 0) {
                aggs.date.aggs = {};
                scope.series.forEach(function (s) {
                  var query = outpatientAggregation.buildAggregationQuery([s], scope.pivot.cols || [], null, scope.form);
                  aggs.date.aggs[s] = query.query.first;
                });
              } else {
                if (scope.pivot.cols.length > 0) {
                  aggs.date.aggs = {};
                  var query = outpatientAggregation.buildAggregationQuery([], scope.pivot.cols, null, scope.form);
                  aggs.date.aggs.second = query.query.first;
                } else {
                }
              }

              var dateFrom = moment(startDate).subtract(years, 'year');
              var lastFrom = dateFrom.format('YYYY-MM-DD');
              var dateTo = moment(endDate).subtract(years, 'year');
              var lastTo = dateTo.format('YYYY-MM-DD');

              var year = moment(endDate).subtract(years, 'year').year();

              var queryString = 'visitDate: [' + lastFrom + ' TO ' + lastTo + ']';

              OutpatientVisitResource.search({
                  q: queryString,
                  size: 0, // we only want aggregations
                  aggs: aggs
                },
                function (data) {
                  if (data.aggregations.date) {
                    var dataStore = {};
                    var ser = scope.series ? angular.copy(scope.series) : [];
                    if (ser.length < 1 && scope.pivot.cols.length > 0) {
                      ser.push('second');
                    }

                    if (ser.length > 0) {
                      data.aggregations.date.buckets.map(function (d) {
                        ser.forEach(function (s) {
                          var buk = d[s].buckets || d[s]._name.buckets;
                          buk = outpatientAggregation.toArray(buk);

                          if (s === 'second') {
                            var count = sumBucket(buk);
                            var label = gettextCatalog.getString('Outpatient visits');
                            if (!dataStore[label]) {
                              dataStore[label] = [];
                            }
                            dataStore[label].push({x: moment(d.key).add(years, 'y').valueOf(), y: count});
                          } else {
                            buk.map(function (entry) {

                              if (plotSeries(entry.key, s)) {
                                var count = entry.count ? entry.count.value : entry.doc_count;
                                if (entry.second && entry.second._name) {
                                  count = sumBucket(entry.second._name.buckets);
                                }
                                if (!dataStore[entry.key]) {
                                  dataStore[entry.key] = [];
                                }
                                dataStore[entry.key].push({x: moment(d.key).add(years, 'y').valueOf(), y: count});
                              }
                            });
                          }
                        });
                      });

                    } else {
                      var counts = extractCounts(data.aggregations.date, years);
                      dataStore[gettextCatalog.getString('Outpatient visits')] = counts;
                    }
                  }

                  var i = 0;
                  angular.forEach(dataStore, function (points, key) {
                    scope.data.push({
                      name: key + ' - ' + year,
                      data: points,
                      id: year + ' - ' + i
                    });
                    i++;
                  });

                  getPreviousYears(years - 1, scope.filters[0].from, scope.filters[0].to)

                });
            } else {
              for (var i = 0; i < scope.data.length; i++) {
                var checkID = scope.data[i].id;
                for (var y = i + 1; y < scope.data.length; y++) {
                  if (scope.data[y].id == checkID) {

                    scope.data.splice(y, 1);
                    y--;
                  }
                }
              }

              scope.chartConfig.series = scope.data;

            }
          };

          /*if (data.aggregations.date) {
           scope.chartConfig.series.push({
           id: 'current',
           name: gettextCatalog.getString('Outpatient visits'),
           data: extractCounts(data.aggregations.date)
           }
           );

           getPreviousYears(loopRange, scope.filters[0].from, scope.filters[0].to);*/

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
              return f.type === 'date-range';
            });

            var dateFilter;
            if (dateFilters.length === 0) {
              // TODO add new date filter
            } else {
              dateFilter = dateFilters[0];
            }

            if (!dateFilter && factor > 1) {
              // with no date filter, the time series is already at max zoom
              return;
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

          /**
           * Zoom the graph to the specified date range
           * WARNING: It is an unchecked error to pass in an invalid date range
           *
           * @param from is the start date (i.e. x-axis minimum on the graph)
           * @param to is the end date (i.e. x-axis maximum on the graph)
           */
          scope.zoomWithRange = function (from, to) {
            var dateFilters = scope.filters.filter(function (f) {
              return f.type === 'date-range';
            });

            var dateFilter;
            if (dateFilters.length === 0) {
              // TODO add new date filter
            } else {
              dateFilter = dateFilters[0];
            }

            if (!dateFilter) {
              dateFilter = {
                filterID: 'date',
                from: new Date(from),
                to: new Date(to)
              };
              scope.filters.push(dateFilter);
              scope.$emit('filterChange', dateFilter, true);
            } else {
              dateFilter.from = new Date(from);
              dateFilter.to = new Date(to);
            }

            scope.$apply();
          };

          /**
           * @param agg
           * @param pValues
           * @param expectedValues
           * @returns values: { [ {x: key, y: count, pValue: pValue, expected: expected} ],[{}]...}
           */
          var extractCounts = function (agg, years) {
            /*jshint camelcase:false */
            var bucket;
            agg.counts = [];
            bucket = agg.buckets || agg._name.buckets;
            return bucket.map(function (b) {
              /*jshint camelcase:false */
              var count = b.count ? b.count.value : b.doc_count;
              agg.counts.push(count);
              //return [b.key, count];
              return {x: moment(b.key).add(years, 'y').valueOf(), y: count};
            });
          };

          var plotSeries = function (seriesName, seriesType) {
            var res = !scope.filters;
            if (scope.filters) {
              var filters = scope.filters.filter(function (filter) {
                return filter.filterID === seriesType && filter.value.length > 0;
              });

              res = res || filters.length === 0;

              for (var i = 0; i < filters.length; i++) {
                res = res || filters[i].value.indexOf(seriesName) !== -1;
              }
            }
            return res;
          };

          scope.$watchCollection('[pivot.rows, pivot.cols, queryString, options.algorithm]', function () {
            reload();
          });

          scope.$watch('options.interval', function () {
            scope.interval = scope.options.interval;
            reload();
          });

          scope.$watch('options.range', function () {
            reload();
          });

          scope.$watch('options.labels.title', function () {
            scope.chartConfig.title.text = scope.options.labels.title;
          });

          scope.$watch('options.labels.x', function () {
            scope.chartConfig.xAxis.title.text = scope.options.labels.x;
          });

          scope.$watch('options.labels.y', function () {
            scope.chartConfig.yAxis.title.text = scope.options.labels.y;
          });

          scope.$watch('options.height', function () {
            scope.chartConfig.size.height = scope.options.height;
          });

          scope.$watch('options.width', function () {
            scope.chartConfig.size.width = scope.options.width;
          });
        }
      };
    }
  }
    ;
})
;
