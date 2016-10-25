'use strict';

var angular = require('angular');
var moment = require('moment');
var directives = require('../scripts/modules').directives;

angular.module(directives.name).directive('outpatientYearOverYear', /*@ngInject*/ function ($rootScope, $filter, $timeout, debounce, $window, $location, $log, updateURL, outpatientAggregation, visualization, OutpatientVisitResource, scopeToJson, EditSettings, $http, possibleFilters, ngTableParams) {

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
      source: '=?',
      widget: '=?',
      gridOptions: '=?',
      form: '=?'
    },
    compile: function () {
      return {
        pre: function (scope, element, attrs) {

          Highcharts.setOptions({
            global: {
              useUTC: false
            }
          });

          var defaultLabels = {
            title: $filter('i18next')('Year Over Year'),
            y: $filter('i18next')('Count'),
            x: $filter('i18next')('Date')
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

          if (scope.options.range) {
            scope.range = scope.options.range
          }
          else {
            scope.range = 1;
            scope.options.range = 1;
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

          var reload = function () {
            debounce(reloadDebounce, 1000).call();
          };

          var queryData = function (yearID, resultFn) {

            var dateFilters = scope.filters.filter(function (f) {
              return f.type === 'date-range';
            });

            console.log(dateFilters);

            var startDateExists = false;
            var endDateExists = false;

            var startDate = null;
            var endDate = null;

            if (dateFilters) {
              for (var i = 0; i < dateFilters.length; i++) {
                if (dateFilters[i].from && !startDateExists) {
                  startDate = moment(dateFilters[i].from);
                  startDateExists = true;
                }
                if (dateFilters[i].to && !endDateExists) {
                  endDate = moment(dateFilters[i].to);
                  endDateExists = true;
                }
              }
            }

            if (!startDateExists) {
              startDate = moment().startOf('year');
            }
            if (!endDateExists) {
              endDate = moment().endOf('year');
            }

            var dateFrom = moment(startDate).subtract(yearID, 'year');
            var lastFrom = dateFrom.format('YYYY-MM-DD');
            var dateTo = moment(endDate).subtract(yearID, 'year');
            var lastTo = dateTo.format('YYYY-MM-DD');

            var year = moment(endDate).subtract(yearID, 'year').year();

            var queryString = 'visitDate: [' + lastFrom + ' TO ' + lastTo + ']';

            console.log(queryString);

            OutpatientVisitResource.get({
              size: 10000,
              q: queryString
            }, function (data) {
              var records = outpatientAggregation.parseResults(data, scope);
              resultFn(yearID, records);

              if (yearID < scope.range) {
                yearID++;
                queryData(yearID, processData)
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

                console.log(scope.data);

                scope.chartConfig.series = scope.data;
                generateRange();

              }
            });
          };

          var processData = function (yearID, records) {
            var opts = {
              rows: scope.pivotOptions.rows || [],
              cols: scope.pivotOptions.cols || []
            };

            //TODO remove visitDate as option from timeseries view
            for (var x = 0; x < opts.cols.length; x++) {
              if (['visitDate', 'visitDOY', 'visitWeek', 'visitISOWeek', 'visitMonth', 'visitQuarter', 'visitYear'].indexOf(opts.cols[x]) !== -1) {
                opts.cols.splice(x, 1);
              }
            }
            switch (scope.interval) {
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

            var dataStore = outpatientAggregation.getCrosstabularData(records, opts, scope);
            fillZeros(dataStore);

            var dateFilters = scope.filters.filter(function (f) {
              return f.type === 'date-range';
            });

            console.log(dateFilters);

            var startDateExists = false

            var year = null;

            if (dateFilters) {
              for (var i = 0; i < dateFilters.length; i++) {
                if (dateFilters[i].to) {
                  year = moment(dateFilters[i].to).subtract(yearID, 'year').year();
                  startDateExists = true;
                  break;
                }
              }
            }

            if (!startDateExists) {
              year = moment().subtract(yearID, 'year').year();
            }

            console.log(year);
            console.log(dataStore);

            for (var key in dataStore) {
              for (var i = 0; i < dataStore[key].length; i++) {
                dataStore[key][i].x = moment(dataStore[key][i].x).add(yearID, 'year').valueOf();
              }

              scope.data.push({
                name: key + ' - ' + year,
                data: dataStore[key],
                id: key + ' - ' + year
              });
            }
          };

          var reloadDebounce = function () {

            console.log("range: " + scope.range);

            scope.pivotOptions = angular.copy(scope.pivot);
            scope.data = [];

            queryData(0, processData);
          };

          /**
           *
           * @param dataStore
           * @param interval, one of 'day', 'week', 'month', 'quarter', 'year'
           */
          var fillZeros = function (dataStore) {

            console.log('**** Zero Fill ****');
            var interval = 'd';
            switch (scope.interval) {
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
            var min = scope.chartConfig.xAxis.min;
            var max = scope.chartConfig.xAxis.max;
            var dateRange = findDateRangeFromFilter();
            if (dateRange) {
              if (dateRange.from) {
                min = moment(dateRange.from).valueOf();
                minFound = true;
              }
              if (dateRange.to) {
                max = moment(dateRange.to).valueOf();
                maxFound = true;
              }
            }

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
            } else {
              scope.chartConfig.xAxis.min = Math.min.apply(Math, [Math.min.apply(Math, minDate), min]);
            }
            if (!maxFound) {
              scope.chartConfig.xAxis.max = Math.max.apply(Math, maxDate);
            } else {
              scope.chartConfig.xAxis.max = Math.max.apply(Math, [Math.max.apply(Math, maxDate), max]);
            }

            // consistent colors
            for (var x = 0; x < scope.data.length; x++) {
              scope.data[x].color = scope.colors[x];
            }
            scope.chartConfig.series = scope.data;
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

          scope.$watchCollection('[pivot.rows, pivot.cols, queryString]', function () {
            reload();
          });

          scope.$watch('options.interval', function () {
            scope.interval = scope.options.interval;
            reload();
          });

          scope.$watch('options.range', function () {
            scope.range = scope.options.range;
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
