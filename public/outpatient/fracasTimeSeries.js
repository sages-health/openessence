'use strict';

var angular = require('angular');
var moment = require('moment');
var directives = require('../scripts/modules').directives;

angular.module(directives.name).directive('outpatientTimeSeries', /*@ngInject*/ function ($timeout, $window, $location,
                                                                                          updateURL, gettextCatalog,
                                                                                          outpatientAggregation,
                                                                                          visualization,
                                                                                          OutpatientVisitResource,
                                                                                          scopeToJson, EditSettings) {

  return {
    restrict: 'E',
    template: require('./time-series.html'),
    scope: {
      options: '=?',
      height: '=?',
      width: '=?',
      queryString: '=',
      filters: '=',
      series: '=?', // array of strings denoting series to graph
      source: '=?',
      widget: '=?'
    },
    compile: function () {
      return {
        pre: function (scope, element, attrs) {

          var defaultLabels = {
            title: gettextCatalog.getString('Timeseries'),
            y: gettextCatalog.getString('Count'),
            x: gettextCatalog.getString('Date')
          };

          scope.options = scope.options || {};
          scope.options.labels = scope.options.labels || defaultLabels;

          scope.series = scope.series || scope.options.series || [];

          scope.interval = scope.options.interval || 'day';

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
                }
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
                  }
                },
                line: {
                  events: {}
                }
              },
              events: {}
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
              minRange: 0,
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
              height: scope.options.height
            }
          };

          /*
           Activating built in highcharts export.

           if (scope.source == 'export') {
           scope.chartConfig.options.exporting.enabled = true;
           }*/

          // Removing click functionality for clickthrough.
          if (scope.source == 'dashboard') {
            scope.chartConfig.options.chart.zoomType = null;
            scope.chartConfig.options.chart.events.click =
              function () {
                var savedWidget = {};
                savedWidget[scope.widget.name] = scope.widget.content;
                sessionStorage.setItem('visualization', JSON.stringify(savedWidget));
                scope.$apply(function () {
                  $location.path('/workbench/').search('visualization', scope.widget.name)
                });
              };
          }

          scope.$on('editVizualizationSettings', function () {
            EditSettings.openSettingsModal('timeseries', scope.options.labels)
              .result.then(function (labels) {
                scope.options.labels = labels;
                scope.chartConfig.yAxis.title.text = scope.options.labels.y;
                scope.chartConfig.xAxis.title.text = scope.options.labels.x;
                scope.chartConfig.title.text = scope.options.labels.title;
              });
          });

          scope.$on('exportVizualization', function () {
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

          scope.$on('saveVizualization', function () {
            visualization.save(angular.extend({}, scopeToJson(scope), {
              visualization: {
                name: 'line'
              },
              pivot: {
                cols: scope.series
              }
            }));
          });

          var reload = function () {

            //if (scope.options.filters[2].value[0] != "LEGEND") {
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
                aggs.date.aggs[s] = outpatientAggregation.getAggregation(s);
              });
            }

            OutpatientVisitResource.search({
                q: scope.queryString,
                size: 0, // we only want aggregations
                aggs: aggs
              }, function (data) {
                //expected scope.data = [ {aggKey, [ [dateMillis, count],.. ]},.. ]
                if (data.aggregations.date) {

                  scope.data = [];
                  var dataStore = {};

                  if (scope.series && scope.series.length > 0) {
                    scope.chartConfig.options.colors = ['#7cb5ec', '#434348', '#90ed7d', '#f7a35c', '#8085e9',
                                                        '#f15c80', '#e4d354', '#8085e8', '#8d4653', '#91e8e1'];

                    data.aggregations.date.buckets.map(function (d) {

                      scope.series.forEach(function (s) {
                        var buk = d[s].buckets || d[s]._name.buckets;
                        buk.map(function (entry) {
                          /*jshint camelcase:false */
                          // if we have filter on this field/series = s
                          // only plot series meeting filter criteria
                          if (plotSeries(entry.key, s)) {
                            var count = entry.count ? entry.count.value : entry.doc_count;
                            if (!dataStore[entry.key]) {
                              dataStore[entry.key] = [];
                            }
                            dataStore[entry.key].push([d.key, count]);
                          }
                        });
                      });
                    });
                    Object.keys(dataStore).forEach(function (k) {
                      scope.data.push({
                        name: k,
                        data: dataStore[k]
                      });
                    });
                  } else {
                    scope.chartConfig.options.colors = ['#7cb5ec'];
                    scope.data = [
                      {
                        name: gettextCatalog.getString('Outpatient visits'),
                        data: extractCounts(data.aggregations.date),
                        marker: {
                          symbol: 'circle'
                        }
                      }
                    ];
                  }
                  scope.chartConfig.series = scope.data;
                }
              }
            )
            ;
            //}
          };

          //var chart = angular.element(document.querySelector('#highcharts-id-' + scope.options.id)).highcharts();
          //var xMin = chart.xAxis[0].min;
          //var xMax = chart.xAxis[0].max;
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

          var extractCounts = function (agg) {
            var bucket = agg.buckets || agg._name.buckets;
            return bucket.map(function (b) {
              /*jshint camelcase:false */
              var count = b.count ? b.count.value : b.doc_count;

              return [b.key, count];
            });
          };

          /*function sortResults (a, b) {
           if (a[0] < b[0]) {
           return -1;
           }
           if (a[0] > b[0]) {
           return 1;
           }
           return 0;
           }*/

          var plotSeries = function (seriesName, seriesType) {
            if (scope.filters) {
              var filters = scope.filters.filter(function (filter) {
                return filter.filterId === seriesType && filter.value.length > 0 &&
                  filter.value.indexOf(seriesName) === -1;
              });
              return filters.length === 0;
            }
            return true;
          };

          scope.$watchCollection('[series, queryString, interval]', function () {
            reload();
            scope.redraw();
          });

          scope.redraw = function () {
            scope.$broadcast('highchartsng.reflow');
          }

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
