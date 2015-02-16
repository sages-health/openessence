'use strict';

var _ = require('lodash');
var angular = require('angular');
var directives = require('../scripts/modules').directives;

angular.module(directives.name).directive('outpatientBarChart', /*@ngInject*/ function ($rootScope, $log, $location, $timeout,
                                                                                           updateURL, gettextCatalog, EditSettings) {
  return {
    restrict: 'E',
    template: require('./bar-chart.html'),
    scope: {
      options: '=',
      queryString: '=',
      filters: '=',
      form: '=?',
      pivot: '=',
      aggData: '=',
      source: '=?',
      widget: '=?'
    },
    compile: function () {
      return {
        pre: function (scope) {

          var defaultLabels = {
            title: gettextCatalog.getString('Bar Chart'),
            y: gettextCatalog.getString('Count'),
            x: gettextCatalog.getString('Category')
          };

          scope.options = scope.options || {};

          scope.options.labels = scope.options.labels || defaultLabels;

          scope.$on('editVisualizationSettings', function () {
            EditSettings.openSettingsModal('bar', scope.options.labels)
              .result.then(function (labels) {
                scope.options.labels = labels;
                scope.chartConfig.yAxis.title.text = scope.options.labels.y;
                scope.chartConfig.xAxis.title.text = scope.options.labels.x;
                scope.chartConfig.title.text = scope.options.labels.title;
              });
          });

          scope.chartConfig = {
            options: {
              chart: {
                type: 'column'
              },
              exporting: {enabled: false},
              tooltip: {
                formatter: function () {
                  return '<span>Category: <i>' + this.key + '</i></span><br/>' + '<span>Value: <b>' + this.y + '</b></span><br/>';
                }
              },
              plotOptions: {
                column: {
                  grouping: false,
                  pointPadding: 0.2
                }
              },
              drilldown: {
                series: []
              }
            },
            xAxis: {
              type: 'category',
              categories: [],
              title: {
                text: scope.options.labels.x
              },
              labels: {
                enabled: true
              }
            },
            yAxis: {
              allowDecimals: false,
              min: 0,
              lineWidth: 1,
              title: {
                text: scope.options.labels.y
              },
              labels: {
                enabled: true
              }
            },
            title: {
              text: scope.options.labels.title
            },
            series: [],
            loading: false,
            credits: {
              enabled: false
            },
            size: {
              width: scope.options.width,
              height: scope.options.height
            }
          };

          /**
           * Get the display name for the data point
           * Also used to match new data points to existing ones
           * @param aggDataPoint either an aggDatapoint or a value (which has these fields)
           * @param tryRowFirst boolean
           * @returns string || null
           */
          var getAggDataPointName = function (aggDataPoint, tryRowFirst) {
            var hasKey = _.has(aggDataPoint, 'key');
            var hasColName = _.has(aggDataPoint, 'colName');
            var hasRowName = _.has(aggDataPoint, 'rowName');
            if (tryRowFirst) {
              return hasRowName ? aggDataPoint.rowName : hasColName ? aggDataPoint.colName : hasKey ? aggDataPoint.key : null;
            } else {
              return hasColName ? aggDataPoint.colName : hasRowName ? aggDataPoint.rowName : hasKey ? aggDataPoint.key : null;
            }
          };

          /**
           * Gathers the values
           * Also used to match new data points to existing ones
           * @param aggDataPoint dataPoint from scope.aggData
           * @param reduceValues boolean
           * @returns Array || Number
           */
          var getAggDataPointValues = function (aggDataPoint, reduceValues) {
            var hasValues = _.has(aggDataPoint, 'values');
            if (hasValues) {
              var values = [];
              _.each(aggDataPoint.values, function (valueData) {
                var hasValue = _.has(valueData, 'value');
                if (hasValue) {
                  values.push(valueData.value);
                }
              });
              if (reduceValues === true) {
                return _.reduce(values, function (sum, value) {
                  return sum + value;
                }, 0);
              } else {
                return values;
              }
            } else {
              return [];
            }
          };

          /**
           * Gets the categories for the bar chart
           * These are used for highCharts configuration
           * @param aggData usually scope.aggData
           * @returns Array
           */
          var getAggDataCategories = function (aggData) {
            var categories = [];
            _.each(aggData, function (aggDataPoint) {
              var name = getAggDataPointName(aggDataPoint, false);
              if (!_.isNull(name)) {
                categories.push(name);
              }
            });
            return categories;
          };


          /**
           * Transforms the aggregated value data into highCharts series format for column chart.
           * This will place it in a nested drill down format for better visual effect
           * @param id unique name of the drilldown, must match parent drilldown name
           * @param aggDataPoint one datapoint of the aggregated data
           * @returns Array
           */
          var addDrillDownSeries = function (id, aggDataPoint) {
            var series = {id: id, name: id, data: [], colorByPoint: true};
            var hasValues = _.has(aggDataPoint, 'values');
            if (hasValues) {
              _.each(aggDataPoint.values, function (valueData) {
                var name = getAggDataPointName(valueData, true);
                var value = _.has(valueData, 'value') ? valueData.value : 0;
                var event = {
                  click: function () {
                    addFilter(valueData);
                  }
                };
                var point = {name: name, y: value, events: event};
                series.data.push(point);
              });
            }
            return series;
          };

          /**
           * Transforms the aggregated data into highCharts series format for column chart.
           * @returns Array
           */
          var getAggDataToHCSeries = function () {
            var series = [];
            var categories = getAggDataCategories(scope.aggData);
            var hasUpperEvent = _.isEmpty(scope.pivot.cols) || _.isEmpty(scope.pivot.rows);
            var hasDrillDown = !hasUpperEvent;
            var drillDownSeries = [];
            _.each(scope.aggData, function (aggDataPoint) {
                var point = {name: null, data: []};
                var name = getAggDataPointName(aggDataPoint, false);
                var aggValue = getAggDataPointValues(aggDataPoint, true);
                if (!_.isNull(name)) {
                  point.name = name;
                  if (!_.isNaN(aggValue) && _.isNumber(aggValue)) {
                    var valueIndex = _.indexOf(categories, name);
                    _.each(_.range(_.size(categories)), function (val, index) {
                        if (index === valueIndex) { // This is the location index where data should be placed
                          var data = {
                            name: name,
                            y: aggValue
                          };
                          if (hasUpperEvent) {
                            var event = {
                              click: function () {
                                addFilter(aggDataPoint);
                              }
                            };
                            _.extend(data, {events: event});
                          }
                          if (hasDrillDown) {
                            drillDownSeries.push(addDrillDownSeries(name, aggDataPoint));
                            _.extend(data, {drilldown: name});
                          }
                          point.data.push(data);
                        }
                        else {
                          point.data.push(null);
                        }
                      }
                    );
                  }
                }
                series.push(point);
              }
            );
            scope.chartConfig.options.drilldown.series = drillDownSeries;
            return series;
          };

          /**
           * Refine the workbench filters based on the data object/point selected on plot
           * @params aggDataPoint
           */
          var addFilter = function (aggDataPoint) {
            var hasCol = _.has(aggDataPoint, 'col');
            var hasRow = _.has(aggDataPoint, 'row');
            var hasColName = _.has(aggDataPoint, 'colName');
            var hasRowName = _.has(aggDataPoint, 'rowName');
            var filter;
            if (hasCol && hasColName) {
              filter = {
                filterID: aggDataPoint.col,
                value: aggDataPoint.colName
              };
              $log.debug('Added Col Filter', filter);
              $rootScope.$emit('filterChange', filter, true, true);
            }
            if (hasRow && hasRowName) {
              filter = {
                filterID: aggDataPoint.row,
                value: aggDataPoint.rowName
              };
              $log.debug('Added Row Filter', filter);
              $rootScope.$emit('filterChange', filter, true, true);
            }
          };


          /**
           * Refreshes the plot
           * @params aggDataPoint
           */
          var reload = function () {
            scope.chartConfig.series = getAggDataToHCSeries();
            $log.info('ChartConfig', scope.chartConfig);
            $timeout(function () {
              scope.$broadcast('highchartsng.reflow');
            });
          };

          var updateVisualization = function () {
            delete scope.options.options;
            updateURL.updateVisualization(scope.options.id, {
              options: scope.options,
              pivot: scope.pivot
            });
          };

          // Removing click functionality for clickthrough.
          if (scope.source === 'dashboard') {
            scope.chartConfig.options.plotOptions.series.point.events = null;
            scope.chartConfig.options.chart.events = {
              click: function () {
                var savedWidget = {};
                savedWidget[scope.widget.name] = scope.widget.content;
                sessionStorage.setItem('visualization', JSON.stringify(savedWidget));
                scope.$apply(function () {
                  $location.path('/workbench/').search('visualization', scope.widget.name);
                });
              }
            };
          }

          scope.$watchCollection('[aggData]', function () {
            reload();
            updateVisualization();
          });

          scope.$watchCollection('[pivot.cols, pivot.rows]', function () {
            updateVisualization();
          });

          scope.$watchCollection('[options.labels.title, options.labels.x, options.labels.y]', function () {
            scope.chartConfig.title.text = scope.options.labels.title;
            scope.chartConfig.xAxis.title.text = scope.options.labels.x;
            scope.chartConfig.yAxis.title.text = scope.options.labels.y;
            updateVisualization();
          });

          scope.$watchCollection('[options.height, options.width]', function () {
            scope.chartConfig.size.height = scope.options.height;
            scope.chartConfig.size.width = scope.options.width;
            reload();
            updateVisualization();
          });


        }
      };
    }
  };

});

