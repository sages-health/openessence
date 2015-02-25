'use strict';

var angular = require('angular');
var moment = require('moment');
var _ = require('lodash');
var directives = require('../scripts/modules').directives;

angular.module(directives.name).directive('outpatientTimeSeries', /*@ngInject*/ function ($timeout, debounce, $window, $location, $log, updateURL, gettextCatalog, outpatientAggregation, visualization, OutpatientVisitResource, scopeToJson, EditSettings, $http) {

  return {
    restrict: 'E',
    template: require('./time-series.html'),
    scope: {
      options: '=?',
      height: '=?',
      width: '=?',
      queryString: '=',
      filters: '=',
      pivot: '=?', //updated to take both pivot cols/rows
      //series: '=?', // array of strings denoting series to graph
      source: '=?',
      widget: '=?',
      tableMapJSON: '=?',
      gridOptions: '=?'
    },
    compile: function () {
      return {
        pre: function (scope, element, attrs) {

          var defaultLabels = {
            title: gettextCatalog.getString('Timeseries'),
            y: gettextCatalog.getString('Count'),
            x: gettextCatalog.getString('Date')
          };

          scope.totalServerItems = 0;

          scope.pagingOptions = {
            pageSizes: [31, 62, 248],
            pageSize: 31,
            currentPage: 1
          };

          scope.$watch('pagingOptions', function (newVal, oldVal) {
            if (newVal != oldVal && newVal.currentPage != oldVal.currentPage) {
              scope.refresh();
            }
          }, true);

          scope.$watch(function () {
            return {
              currentPage: scope.pagingOptions.currentPage,
              pageSize: scope.pagingOptions.pageSize
            };
          },
          function (newVal, oldVal) {
            // Reset to page 1 when the page size changes
            if (newVal.pageSize != oldVal.pageSize) {
              scope.pagingOptions.currentPage = 1;
            }

            fillGrid(scope.pagingOptions.currentPage, scope.pagingOptions.pageSize);
          },
          true);

          var fillGrid = function (currentPage, pageSize) {
              scope.gridData = scope.tableMapJSON.slice((scope.pagingOptions.currentPage - 1) * scope.pagingOptions.pageSize, (scope.pagingOptions.currentPage + 1) * scope.pagingOptions.pageSize);
          }

          scope.tableMapJSON = scope.tableMapJSON || [{data: 0, series: 'series', count: 0, pValue: 1, expected: 0}];
          scope.gridData = scope.tableMapJSON;

          scope.gridOptions = {
            data: 'gridData',
              columnDefs: [
              //{field:'date', displayName:'Date', cellTemplate: "{{row.entity[col.field]| date:'shortDate'}}"},
              {field:'date', displayName:'Date'},
              {field:'series', displayName:'Series'},
              {field:'count', displayName:'Count'},
              {field:'pValue', displayName:'p-Value',
                cellTemplate: '<div class="ngCellText" ng-class="{\'warning\' : row.getProperty(\'pValue\') <.05 && row.getProperty(\'pValue\') > .01,  \'alert\': row.getProperty(\'pValue\') <=.01 }">{{ row.getProperty(col.field) | number:0}}</div>'
              },
              {field:'expected', displayName:'Expected Value',
                cellTemplate: '<div class="ngCellText" ng-class="{\'warning\' : row.getProperty(\'pValue\') <.05 && row.getProperty(\'pValue\') > .01,  \'alert\': row.getProperty(\'pValue\') <=.01 }">{{ row.getProperty(col.field) | number:3}}</div>'
              }
            ],
            enablePaging: true,
            showFooter: true,
            pagingOptions: scope.pagingOptions,
            showGroupPanel: true
          }


          scope.options = scope.options || {};
          scope.options.labels = scope.options.labels || defaultLabels;
          //TODO.. pivot cols should define an aggregation(count) field
          // pivot rows should define the series..
          //e.g. pivot.rows=facility, pivot.cols=Symptom (total symptoms (or summation of symtoms count)).. assumes user will filter
          scope.series = scope.pivot.rows || scope.options.series || [];
          if (scope.options.interval) {
            scope.interval = scope.options.interval;
          }
          else {
            scope.interval = 'day';
            scope.options.interval = 'day';
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
           //Activating built in highcharts export.
           if (scope.source === 'export') {
           scope.chartConfig.options.exporting.enabled = true;
           }
           */

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
                //aggs.date.aggs[s] = outpatientAggregation.getAggregation(s, null, scope.form);
                var query = outpatientAggregation.buildAggregationQuery([s], scope.pivot.cols || [], null, scope.form);
                aggs.date.aggs[s] = query.query.first;
              });
            } else {
              //no series to create, but we must count by the given field
              if (scope.pivot.cols.length > 0) {
                aggs.date.aggs = {};
                var query = outpatientAggregation.buildAggregationQuery([], scope.pivot.cols, null, scope.form);
                aggs.date.aggs.second = query.query.first;
              } else {
                //no columns selected.. no timeseries?
              }
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
                  //TODO cycles through colors each time series is pushed/removed, need to reset colors/index
                  scope.chartConfig.options.colors = ['#7cb5ec', '#434348', '#90ed7d', '#f7a35c', '#8085e9',
                    '#f15c80', '#e4d354', '#8085e8', '#8d4653', '#91e8e1'];
                  var ser = scope.series ? angular.copy(scope.series) : [];
                  if (ser.length < 1 && scope.pivot.cols.length > 0) {
                    ser.push('second');
                  }
                  if (ser.length > 0) {
                    data.aggregations.date.buckets.map(function (d) {
                      ser.forEach(function (s) {
                        var buk = d[s].buckets || d[s]._name.buckets;
                        buk = outpatientAggregation.toArray(buk);

                        if (s === 'second') { //TODO future proof word use
                          //they selected just a column, make sure we total by column.count if available
                          var count = sumBucket(buk);
                          var label = gettextCatalog.getString('Outpatient visits');
                          if (!dataStore[label]) {
                            dataStore[label] = [];
                          }
                          dataStore[label].push({x: d.key, y: count});
                        } else {
                          buk.map(function (entry) {
                            /*jshint camelcase:false */
                            // if we have filter on this field/series = s
                            // only plot series meeting filter criteria
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
                    calcPValues(dataStore, scope.options.algorithm);
                    //scope.chartConfig.series = scope.data;
                  } else {
                    var counts = extractCounts(data.aggregations.date, null, null);
                    dataStore[gettextCatalog.getString('Outpatient visits')] = counts;
                    calcPValues(dataStore, scope.options.algorithm);
                  }
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

          /*
           var extractCounts = function (agg) {
           var bucket = agg.buckets || agg._name.buckets;
           return bucket.map(function (b) {
           var count = b.count ? b.count.value : b.doc_count;

           return [b.key, count];
           });
           };
           */

          var createTableJSON = function () {
            var data = scope.chartConfig.series;
            scope.tableMapJSON = [];
            if (data !== undefined && data !== null && data.length > 0) {
              for (var i = 0; i < data.length; i++) {
                var pair = data[i];
                for (var j = 0; j < pair.data.length; j++) {
                  var dp = pair.data[j];
                  var date = new Date(dp.x);
                  scope.tableMapJSON.push({
                    //date: dp.x,
                    date: date.toLocaleDateString(),
                    series: pair.name,
                    count: dp.y,
                    pValue: dp.pValue,
                    expected: dp.expected
                  });
                }
                fillGrid(scope.pagingOptions.currentPage, scope.pagingOptions.pageSize);
              }
            }
            //console.log(scope.tableMapJSON);
          };

          /**
           * @param agg
           * @param pValues
           * @param expectedValues
           * @returns values: { [ {x: key, y: count, pValue: pValue, expected: expected} ],[{}]...}
           */
          var extractCounts = function (agg, pValues, expectedValues) {
            /*jshint camelcase:false */
            var bucket;
            if (pValues === null) {
              agg.counts = [];
              bucket = agg.buckets || agg._name.buckets;
              return bucket.map(function (b) {
                /*jshint camelcase:false */
                var count = b.count ? b.count.value : b.doc_count;
                agg.counts.push(count);
                //return [b.key, count];
                return {x: b.key, y: count, pValue: null, expected: null};
              });
            } else {
              bucket = agg.buckets || agg._name.buckets;
              var values = [];
              for (var i = 0; i < bucket.length && i < pValues.length; i++) {
                var count = bucket[i].count ? bucket[i].count.value : bucket[i].doc_count;
                var pValue = pValues[i] === null ? 1 : pValues[i];
                var expected = expectedValues[i] === null ? 0 : expectedValues[i];
                values.push(populatePValue(pValue, bucket[i].key, count, expected));
              }
              return values;
            }
          };

          var calcPValues = function (dataStore, algorithm) {
            var algorithmString = (algorithm === 'EWMA') ? '/detectors/ewma' : '/detectors/cusum';
            //$log.log('using algorithm' + algorithmString);
            angular.forEach(dataStore, function (points, key) {
              var counts = points.map(function (c) {
                return c.y;
              });
              var pValues = [];
              var expectedValues = [];

              $http.post(algorithmString,
                {
                  data: counts,
                  baseline: 28,
                  guardBand: 2
                }
              ).
                success(function (resp) {
                  //$log.log(resp.pValues);
                  pValues = resp.pValues;
                  expectedValues = resp.expectedValues;

                  if (pValues.length > 0) {
                    var values = [];
                    for (var i = 0; i < points.length && i < pValues.length; i++) {
                      var pValue = pValues[i] === null ? 1 : pValues[i];
                      var expected = expectedValues[i] === null ? 0 : expectedValues[i];
                      values.push(populatePValue(pValue, points[i].x, points[i].y, expected));
                    }
                    //name: gettextCatalog.getString('Outpatient visits'),
                    /*data: [{
                     x: 6,
                     y: 3.9,
                     marker: {
                     symbol: 'url(http://www.highcharts.com/demo/gfx/snow.png)'
                     }
                     }, [3, 4.2], [5, 5.7] ]
                     */
                    scope.data.push({
                      name: key,
                      data: values
                    });
                  } else {
                    scope.data.push({
                      name: key,
                      data: points
                    });
                  }
                  scope.chartConfig.series = scope.data;
                  createTableJSON();
                }).error(function () {
                  scope.data.push({
                    name: key,
                    data: points
                  });

                });
            });
            scope.chartConfig.series = scope.data;
            createTableJSON();
          };

          /**
           *
           * @param pValue
           * @param x
           * @param count
           * @param expected
           * @returns {*}
           */
          var populatePValue = function (pValue, x, count, expected) {
            var pv = {
              x: x,
              y: count,
              pValue: pValue,
              expected: expected
            };
            // between 0.01 and 0.05 = yellow
            if (pValue <= 0.05 && pValue > 0.01) {
              pv.marker = {
                fillColor: '#ffff00'
              };
            } else if (pValue <= 0.01) {
              pv.marker = {
                fillColor: '#ff0000'
              };
            }
            return pv;
          };

          var plotSeries = function (seriesName, seriesType) {
            if (scope.filters) {
              var filters = scope.filters.filter(function (filter) {
                return filter.filterID === seriesType && filter.value.length > 0 &&
                  filter.value.indexOf(seriesName) === -1;
              });
              return filters.length === 0;
            }
            return true;
          };

          scope.$watchCollection('[pivot.rows, pivot.cols, queryString, options.algorithm]', function () {
            reload();
            //scope.redraw();
          });

          scope.$watch('options.interval', function () {
            scope.interval = scope.options.interval;
            reload();
          });

          /*scope.redraw = function () {
           scope.$broadcast('highchartsng.reflow');
           }*/

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

          /*
          scope.criteria = 'date';
          scope.direction = false;
          scope.setCriteria = function (criteria) {
            if (scope.criteria === criteria) {
              scope.direction = !scope.direction;
            } else {
              scope.criteria = criteria;
              scope.direction = false;
            }
          };
          */



        }
      };
    }
  };
});
