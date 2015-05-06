'use strict';

var angular = require('angular');
var directives = require('../scripts/modules').directives;

angular.module(directives.name).directive('outpatientBarChart', /*@ngInject*/ function ($rootScope, $log, $location, $timeout, debounce,
                                                                                        updateURL, $filter, EditSettings) {
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
            title: $filter('i18next')('Bar Chart'),
            y: $filter('i18next')('Count'),
            x: $filter('i18next')('Category')
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
                type: 'column',
                animation: false,
                events: {}
              },
              exporting: {enabled: false},
              tooltip: {
                formatter: function () {

                  var identifier = '';
                  if (this.series.options.id === 'single') {
                    identifier = 'Count';
                  } else {
                    identifier = this.series.name;
                  }

                  return '<span>Category: <i>' + this.key + '</i></span><br/>' + '<span>' + identifier + ': <b>' + this.y + '</b></span><br/>';
                }
              },
              plotOptions: {
                column: {
                  pointPadding: 0.1,
                  borderWidth: 0,
                  groupPadding: 0
                },
                series: {
                  point: {
                    events: {
                      click: function () {

                        var point = {
                          name: null,
                          col: null
                        };

                        if (this.series.options.id === 'single') {
                          point.name = this.category;
                          if (scope.pivot.cols.length > 0) {
                            point.col = scope.pivot.cols[0];
                          } else {
                            point.col = scope.pivot.rows[0];
                          }
                        } else {
                          point.name = this.series.name;
                          point.col = scope.pivot.cols[0];
                        }

                        narrowFilters(point);
                      }
                    }
                  }
                }
              },
              legend: {
                enabled: true
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
              title: {
                text: scope.options.labels.y
              },
              min: 0
            },
            title: {
              text: scope.options.labels.title
            },
            series: [],
            credits: {
              enabled: false
            },
            size: {
              width: scope.options.width - 10,
              height: scope.options.height
            }
          };

          /**
           * Refreshes the plot
           * @params aggDataPoint
           */
          var reload = function () {
            debounce(reloadDebounce, 200).call();
          };

          var reloadDebounce = function () {

              scope.chartConfig.series = [];
              scope.chartConfig.xAxis.categories = [];

              for (var i = 0; i < scope.aggData.length; i++) {
                if (typeof scope.aggData[i].colName === 'undefined') {
                  //scope.chartConfig.xAxis.categories.push(scope.aggData[i].key);
                  scope.chartConfig.xAxis.categories.push(scope.aggData[i].values[0].colName || '');
                } else {
                  scope.chartConfig.xAxis.categories.push(scope.aggData[i].colName);
                }
              }

              var colors = Highcharts.getOptions().colors;

              var series = [];

              if ((scope.pivot.cols.length <= 0 && scope.pivot.rows.length > 0) || (scope.pivot.rows.length <= 0 && scope.pivot.cols.length > 0)) {

                scope.chartConfig.options.legend.enabled = false;

                var series = [{
                                id: 'single',
                                data: [],
                                color: colors[0]
                              }];
                for (var i = 0; i < scope.aggData.length; i++) {
                  series[0].data.push(scope.aggData[i].values[0].value);
                }
              } else {
                scope.chartConfig.options.legend.enabled = true;

                var subCats = [];

                for (var i = 0; i < scope.aggData.length; i++) {
                  for (var y = 0; y < scope.aggData[i].values.length; y++) {
                    var found = false;
                    for (var x = 0; x < subCats.length; x++) {
                      if (subCats[x] === scope.aggData[i].values[y].rowName) {
                        found = true;
                      }
                    }

                    if (found === false) {
                      if (typeof scope.aggData[i].values[y].rowName !== 'undefined') {
                        subCats.push(scope.aggData[i].values[y].rowName);
                      }
                    }
                  }
                }

                for (var x = 0; x < subCats.length; x++) {
                  var subSeries = {
                    name: subCats[x],
                    data: [],
                    color: colors[x]
                  };

                  for (var i = 0; i < scope.aggData.length; i++) {

                    var found = false;

                    if (scope.aggData[i].values.length > 0) {
                      for (var y = 0; y < scope.aggData[i].values.length; y++) {
                        if (subSeries.name === scope.aggData[i].values[y].rowName) {
                          subSeries.data.push(scope.aggData[i].values[y].value);
                          found = true;
                        }
                      }
                    }

                    if (found === false) {
                      subSeries.data.push(0);
                    }
                  }

                  series.push(subSeries);
                }
              }

              scope.chartConfig.series = series;
            };

          var narrowFilters = function (point) {
            var column = removeAsterix(point.col);

            var filter = {
              filterID: column,
              value: point.name
            };
            $rootScope.$emit('filterChange', filter, true, true);
          };

          var chartToWorkbench = function () {
            var savedWidget = {};
            savedWidget[scope.widget.name] = scope.widget.content;
            sessionStorage.setItem('visualization', JSON.stringify(savedWidget));
            scope.$apply(function () {
              $location.path('/workbench/').search('visualization', scope.widget.name);
            });
          };

          // Removing click functionality for clickthrough.
          if (scope.source === 'dashboard') {
            scope.chartConfig.options.plotOptions.series.point.events = {
              click: chartToWorkbench
            };
            scope.chartConfig.options.chart.events = {
              click: chartToWorkbench
            };
          }

          var removeAsterix = function (string) {
            var response = null;
            if (string.lastIndexOf('*') > 0) {
              response = string.substring(0, string.lastIndexOf('*'));
            } else {
              response = string;
            }

            return response;
          };

          scope.$watchCollection('[aggData]', function () {
            reload();
          });

          scope.$watchCollection('[options.labels.title, options.labels.x, options.labels.y]', function () {
            scope.chartConfig.title.text = scope.options.labels.title;
            scope.chartConfig.xAxis.title.text = scope.options.labels.x;
            scope.chartConfig.yAxis.title.text = scope.options.labels.y;
          });

          scope.$watchCollection('[options.height, options.width]', function () {
            scope.chartConfig.size.height = scope.options.height;
            scope.chartConfig.size.width = scope.options.width - 10;
          });

        }
      };
    }
  };

});

