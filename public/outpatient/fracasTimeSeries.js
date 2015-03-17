'use strict';

var angular = require('angular');
var moment = require('moment');
var directives = require('../scripts/modules').directives;

angular.module(directives.name).directive('outpatientTimeSeries', /*@ngInject*/ function ($rootScope, $filter, $timeout, debounce, $window, $location, $log, updateURL, gettextCatalog, outpatientAggregation, visualization, OutpatientVisitResource, scopeToJson, EditSettings, $http, possibleFilters, ngTableParams) {

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
      source: '=?',
      widget: '=?',
      tableMapJSON: '=?',
      gridOptions: '=?',
      form: '=?'
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
          scope.visualization = scope.visualization || scope.options.visualization || {
            name: 'line'
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
          scope.refresh = false;

          scope.form = scope.form || {};

          // index fields by name
          scope.$watch('form.fields', function (fields) {
            if (!fields) {
              return;
            }

            scope.fields = fields.reduce(function (fields, field) {
              fields[field.name] = field;
              return fields;
            }, {});
          });

          scope.data = [];
          scope.tableData = [];

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
                }, false]
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
                week: '%Y-%m-%d--%W'
                //TODO: isoWeek: '%G-%V'
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
              pivot: scope.pivot,
              source: 'export'
            }));
          });

          scope.$on('saveVisualization', function () {
            visualization.save(angular.extend({}, scopeToJson(scope), {
              visualization: {
                name: 'line'
              },
              pivot: scope.pivot
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
            //to switch: reloadDebounce = old aggregations, reloadDebounce2 = crosstabular
            debounce(reloadDebounce2, 1000).call();
          };

          var queryData = function (resultFn) {

            OutpatientVisitResource.get({
              size: 999999,
              q: scope.queryString
            }, function (data) {
              var records = outpatientAggregation.parseResults(data, scope);
              resultFn(records);
            });
          };

          var reloadDebounce2 = function () {
            scope.pivotOptions = angular.copy(scope.pivot);

            queryData(function (records) {
              var opts = {
                rows: scope.pivotOptions.rows || [],
                cols: scope.pivotOptions.cols || []
              };

              //TODO remove visitDate as option from timeseries view
              for (var x = 0; x < opts.cols.length; x++) {
                if (['visitDate','visitDOY','visitWeek'].indexOf(opts.cols[x] !== -1)) {
                  opts.cols.splice(x, 1);
                }
              }
              switch(scope.interval){
                case 'week':
                  opts.cols.unshift('visitWeek');
                  break;
                case 'isoWeek':
                  opts.cols.unshift('visitISOWeek');
                  break;
                case 'month':
                  opts.cols.unshift('visitMonth');
                  break;
                case 'quarter':
                  opts.cols.unshift('visitQuarter');
                  break;
                case 'year':
                  opts.cols.unshift('visitYear');
                  break;
                default:
                  opts.cols.unshift('visitDOY');
              }

              scope.data = [];
              var dataStore = outpatientAggregation.getCrosstabularData(records, opts, scope);
              fillZeros(dataStore);
              //Currently the crosstab provides just dates with data, we need to zero fill, as well as meet the filter range?
              calcPValues(dataStore, scope.options.algorithm);

            });
          };

          /**
           *
           * @param dataStore
           * @param interval, one of 'day', 'week', 'month', 'quarter', 'year'
           */
          var fillZeros = function (dataStore) {

            console.log('**** Zero Fill ****');
            var interval = 'd';
            switch(scope.interval){
              case 'week':
                interval = 'w';
                break;
              case 'isoWeek':
                interval = 'w';
                break;
              case 'month':
                interval = 'M';
                break;
              case 'quarter':
                interval = 'Q';
                break;
              case 'year':
                interval = 'y';
                break;
            }

            if (dataStore && Object.keys(dataStore).length > 0) {
              angular.forEach(dataStore, function (points, key) {
                var filledPoints = [];
                var counts = points.map(function (c) {
                  return c.y;
                });
                //current assumption that crosstab returns days in order //TODO verify this
                var dates = points.map(function (c) {
                  return c.x;
                });

                var curDate = moment(dates[0]);
                var maxDate = moment(dates[dates.length - 1]);
                var ix = 0;
                while (curDate.isBefore(maxDate) || curDate.isSame(maxDate)) {
                  //console.log("minDate: " + minDate.format());
                  //console.log("date[ix]: " + moment(dates[ix]).format());
                  if (curDate.isSame(moment(dates[ix]))) {
                    filledPoints.push({x: curDate.valueOf(), y: (counts[ix] || 0)});
                    ix++;
                  } else {
                    filledPoints.push({x: curDate.valueOf(), y: 0});
                  }
                  curDate.add(1, interval);
                }
                dataStore[key] = filledPoints;
              });

            }

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
          };

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
            var timespan = moment(dateFilter.to).valueOf() - moment(dateFilter.from).valueOf();
            // TODO use endpoints of data instead, since they can't be undefined
            // TODO no way to get tick values from SVG we should just use d3 directly

            var center = moment(dateFilter.to).valueOf() - timespan / 2;
            var to = center + timespan * factor / 2;
            var from = center - timespan * factor / 2;

            var now = moment().valueOf();
            // don't look into the future unless we already are
            if (to > now && moment(dateFilter.to).valueOf() < now) {
              from = from - (to - now);
              to = now;
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
              dateFilter.from = moment(from, 'x');
              dateFilter.to = moment(to,'x');
            } else {
              // add a new filter we we zoom in, action can be reversed by deleting this new filter
              scope.filters.push(
                angular.extend({
                  from: new moment(from, 'x'),
                  to: moment(to, 'x')
                }, possibleFilters.possibleFilters.visitDate)); // TODO filter panel needs to watch for changes to filters
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
              dateFilter = angular.extend({
                from: new Date(from),
                to: new Date(to)
              }, possibleFilters.possibleFilters.visitDate);
              $rootScope.$emit('filterChange', dateFilter, true, true);
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
            var counts, pValues, expectedValues;
            var algorithmString = (algorithm === 'EWMA') ? '/detectors/ewma' :
              (algorithm === 'CUSUM') ? '/detectors/cusum' : undefined;
            //$log.log('using algorithm' + algorithmString);
            angular.forEach(dataStore, function (points, key) {
              counts = points.map(function (c) {
                return c.y;
              });
              pValues = [];
              expectedValues = [];

              if (!algorithmString) {
                scope.data.push({
                  name: key,
                  data: points
                });
              }
              else {
                counts = points.map(function (c) {
                  return c.y;
                });
                pValues = [];
                expectedValues = [];

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
                    generateRange();
                    createTableJSON();
                  }).error(function () {
                    scope.data.push({
                      name: key,
                      data: points
                    });
                  });
              }
            });

            generateRange();
            createTableJSON();
          };


          /**
           * Currently finds the narrowest range among all date filters.
           * @returns dateRange = {from: -1, to: -1}  -1 if not found, time in millis if found
           */
          var findDateRangeFromFilter = function () {
            var dateRange = {from: 0, to: 0};
            var filteredDate;
            var mins = [];
            var maxs = [];

            for (var i = 0; i < scope.filters.length; i++) {
              if (scope.filters[i].filterID === 'visitDate') {
                filteredDate = scope.filters[i];
                if (filteredDate.from) {
                  mins.push(moment(filteredDate.from).valueOf());
                }
                if (filteredDate.to) {
                  maxs.push(moment(filteredDate.to).valueOf());
                }
              }
            }
            dateRange.from = mins ? Math.min(mins) : 0;
            dateRange.to = maxs ? Math.max(maxs) : 0;
            return filteredDate;
          };

          var generateRange = function () {
            var minFound = false;
            var maxFound = false;
            var minDate = [];
            var maxDate = [];
            var dateRange = findDateRangeFromFilter();
            if(dateRange) {
              if (dateRange.from) {
                scope.chartConfig.xAxis.min = moment(dateRange.from).valueOf();
                minFound = true;
              }
              if (dateRange.to) {
                scope.chartConfig.xAxis.max = moment(dateRange.to).valueOf();
                maxFound = true;
              }
            }
            // Remove record outside of range
            //for (var x = 0; x < scope.data.length; x++) {
            //  if (dateRange.from) {
            //    if (typeof scope.data[x].data[0] !== 'undefined') {
            //      if (moment(scope.data[x].data[0].x, 'x').valueOf() < moment(dateRange.from).valueOf()) {
            //        scope.data[x].data.splice(0, 1);
            //        x--;
            //      }
            //    }
            //  }
            //}
            var getX = function (o) {
              return o.x;
            };

            for (var x = 0; x < scope.data.length; x++) {
              if (scope.data[x].data.length > 0) {
                minDate.push(Math.min.apply(Math, scope.data[x].data.map(getX)));
                maxDate.push(Math.max.apply(Math, scope.data[x].data.map(getX)));
              }
            }

            if (!minFound) {
              scope.chartConfig.xAxis.min = Math.min.apply(Math, minDate);
            }
            if (!maxFound) {
              scope.chartConfig.xAxis.max = Math.max.apply(Math, maxDate);
            }

            // consistent colors
            for (var x = 0; x < scope.data.length; x++) {
              scope.data[x]['color'] = scope.colors[x];
            }
            scope.chartConfig.series = scope.data;
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

          /* ngTable options */

          scope.calculateRows = function () {
            var rowHeightAvailable = scope.options.height - 70;
            var rowsAvailable = Math.floor(rowHeightAvailable / 28);
            if (rowsAvailable < 1) {
              return 1;
            } else {
              return rowsAvailable;
            }
          };

          scope.tableParams = new ngTableParams({
            page: 1,            // show first page
            count: scope.calculateRows,           // count per page
            sorting: {
              date: 'asc'     // initial sorting
            }
          }, {
            counts: [], // hide page count control
            getData: function ($defer, params) {
              var orderedData = params.sorting() ?
                $filter('orderBy')(scope.tableData, params.orderBy()) :
                scope.tableData;
              $defer.resolve(orderedData.slice((params.page() - 1) * params.count(), params.page() * params.count()));
            }
          });

          scope.tableHeight = {
            'height': scope.options.height + 'px',
            'overflow-y': 'auto'
          };

          var createTableJSON = function () {
            scope.tableData = [];

            for (var i = 0; i < scope.data.length; i++) {
              for (var j = 0; j < scope.data[i].data.length; j++) {

                var color = '';

                if (typeof scope.data[i].data[j].marker !== 'undefined') {
                  if (scope.data[i].data[j].marker.fillColor == '#ffff00') {
                    color = 'yellow';
                  } else if (scope.data[i].data[j].marker.fillColor == '#ff0000') {
                    color = 'red';
                  }
                }

                scope.tableData.push({
                  date: scope.data[i].data[j].x,
                  dateView: moment(scope.data[i].data[j].x).format('MMM DD,YYYY'),
                  value: scope.data[i].data[j].y,
                  series: scope.data[i].name,
                  expected: Math.round(scope.data[i].data[j].expected * 1000) / 1000,
                  pValue: Math.round(scope.data[i].data[j].pValue * 1000) / 1000,
                  color: color
                });
              }
            }

            scope.tableParams.parameters({count: scope.tableData.length});
            scope.tableParams.reload();
          };

          /* Watchers */

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
            scope.tableHeight = {"height": scope.options.height};
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

angular.module(directives.name).directive('fixedTableHeaders', ['$timeout', function ($timeout) {
  return {
    restrict: 'A',
    link: function (scope, element, attrs) {
      $timeout(function () {
        var container = element.parentsUntil(attrs.fixedTableHeaders);
        element.stickyTableHeaders({scrollableArea: container});
      }, 0);
    }
  }
}]);

