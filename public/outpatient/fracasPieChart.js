'use strict';

var angular = require('angular');
var directives = require('../scripts/modules').directives;
var Highcharts = require('highcharts');
require('highcharts/modules/exporting')(Highcharts);
require('highcharts/modules/offline-exporting')(Highcharts);

angular.module(directives.name).directive('outpatientPieChart', /*@ngInject*/ function ($rootScope, debounce, updateURL, //
  $filter, EditSettings, $location) {
  return {
    restrict: 'E',
    template: require('./pie-chart.html'),
    scope: {
      options: '=',
      width: '=?',
      height: '=?',
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
        pre: function (scope, element) {

          scope.options = scope.options || {};
          scope.options.labels = scope.options.labels || {
            title: $filter('i18next')('Pie Chart')
          };
          scope.options.labels.displayNumber = scope.options.labels.displayNumber || 5;

          scope.$on('editVisualizationSettings', function () {
            EditSettings.openSettingsModal('pie', scope.options.labels)
              .result.then(function (labels) {
                scope.options.labels = labels;
              });
          });

          scope.refresh = false;

          var colors = Highcharts.getOptions().colors;

          scope.chartConfig = {
            chart: {
              plotShadow: false,
              type: 'pie',
              events: {},
              width: scope.options.width - 10,
              height: scope.options.height
            },
            navigation: {
              buttonOptions: {
                enabled: false
              }
            },
            credits: {
              enabled: false
            },
            exporting: {
              fallbackToExportServer: false,
              chartOptions: {
                plotOptions: {
                  series: {
                    dataLabels: {
                      enabled: true
                    }
                  }
                }
              }
            },
            tooltip: {
              pointFormat: 'Count: <b>{point.y}</b>'
            },
            plotOptions: {
              pie: {
                allowPointSelect: true,
                cursor: 'pointer'
              },
              series: {
                point: {
                  events: {
                    click: function () {
                      var point = {
                        name: this.name,
                        col: this.series.name
                      };

                      narrowFilters(point);
                    }
                  }
                }
              }
            },
            title: {
              text: scope.options.labels.title
            }
          };

          var reload = function () {
            debounce(reloadDebounce, 200).call();
          };

          var reloadDebounce = function () {

            scope.chartConfig.series = [];

            var series = [];
            var inner = [];
            var outer = [];

            if (scope.pivot.cols.length > 0) {

              var innerData = scope.aggData.concat();
              innerData = innerData.sort(function (a, b) {
                return b.value - a.value;
              });
              innerData = innerData.slice(0, scope.options.labels.displayNumber);
              var color = 0;

              for (var i = 0; i < innerData.length; i++) {
                innerData[i].name = innerData[i].colName;
                innerData[i].y = innerData[i].value;
              }

              for (var i = 0; i < innerData.length; i++) {
                var found = false;

                for (var j = 0; j < inner.length; j++) {
                  if (innerData[i].colName === inner[j].colName) {
                    inner[j].y = inner[j].y + innerData[i].y;
                    found = true;
                    break;
                  }
                }

                if (found === false) {
                  innerData[i].color = colors[color];
                  color++;
                  inner.push(innerData[i]);
                }
              }

              if (scope.pivot.rows.length > 0) {
                series.push({
                  id: 'cols',
                  name: innerData[0].col,
                  data: inner,
                  size: '80%',
                  dataLabels: {
                    formatter: function () {
                      if (this.y > 5 || inner.length < 4) {
                        return this.point.name + ' : ' + this.point.y;
                      } else {
                        return null;
                      }
                    },
                    color: 'white',
                    distance: -40
                  }
                });
              } else {
                console.log(innerData);
                series.push({
                  id: 'cols',
                  name: innerData[0].col,
                  data: inner,
                  size: '100%',
                  innerSize: '0',
                  dataLabels: {
                    formatter: function () {
                      return this.point.name + ' : ' + this.point.y;
                    },
                    color: 'black',
                    distance: 30
                  }
                });
              }
            }

            if (scope.pivot.rows.length > 0) {

              var catName = '';
              var sourceName = '';
              var source = '';
              if (scope.pivot.cols.length > 0) {
                sourceName = 'rowName';
                catName = 'colName';
                source = 'row';
              } else {
                sourceName = 'colName';
                catName = 'rowName';
                source = 'row';
              }

              var parent = '';
              var colorVal = null;
              var color = 0;
              var brightScale = 10;

              var length = scope.aggData.length < scope.options.labels.displayNumber ? scope.aggData.length : scope.options.labels.displayNumber;

              scope.aggData = scope.aggData.sort(function (a, b) {
                return b.value - a.value;
              });

              for (var x = 0; x < length; x++) {

                if (scope.pivot.cols.length > 0) {
                  var brightness = 0.2 - (x / brightScale) / 5;

                  if (scope.aggData[x][catName] === parent) {
                    colorVal = Highcharts.Color(colors[color]).brighten(brightness).get();
                    brightness--;

                  } else {
                    if (x !== 0) {
                      color++;
                    }
                    parent = scope.aggData[x][catName];
                    brightScale = 50;
                    colorVal = Highcharts.Color(colors[color]).brighten(0.2 - (x / brightScale) / 5).get();
                    brightScale--;
                  }
                } else {
                  colorVal = colors[x];
                }

                outer.push({
                  name: scope.aggData[x][sourceName],
                  y: scope.aggData[x].value,
                  color: colorVal
                });
              }

              if (scope.pivot.cols.length > 0) {
                series.push({
                  id: 'rows',
                  name: scope.aggData[0][source],
                  data: outer,
                  size: '100%',
                  innerSize: '80%',
                  dataLabels: {
                    formatter: function () {
                      return this.point.name + ' : ' + this.point.y;
                    },
                    color: 'black',
                    distance: 30
                  }
                });
              } else {

                series.push({
                  id: 'rows',
                  name: removeAsterix(scope.aggData[0] ? scope.aggData[0].col : ''),
                  data: outer,
                  size: '100%',
                  innerSize: '0',
                  dataLabels: {
                    formatter: function () {
                      return this.point.name + ' : ' + this.point.y;
                    },
                    color: 'black',
                    distance: 30
                  }
                });
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

          // Removing functionality for clickthrough.
          if (scope.source === 'dashboard') {
            scope.chartConfig.plotOptions.series.point.events = {
              click: chartToWorkbench
            };
            scope.chartConfig.chart.events = {
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

          scope.$on('exportPNG', function () {
            scope.chartConfig.getChartObj().exportChartLocal({
              type: 'image/png',
              filename: "chart"
            });
          });

          scope.$on('exportJPEG', function () {
            scope.chartConfig.getChartObj().exportChartLocal({
              type: 'image/jpeg',
              filename: "chart"
            });
          });

          scope.$on('exportPDF', function () {
            scope.chartConfig.getChartObj().exportChartLocal({
              type: 'application/pdf',
              filename: "chart"
            });
          });

          scope.$on('printChart', function () {
            scope.chartConfig.getChartObj().print();
          });

          scope.$watchCollection('[aggData]', function () {
            reload();
          });

          scope.$watch('options.labels.title', function () {
            scope.chartConfig.title.text = scope.options.labels.title;
          });

          scope.$watch('options.labels.displayNumber', function () {
            reload();
          });

          scope.$watchCollection('[options.height, options.width]', function () {
            scope.chartConfig.chart.height = scope.options.height;
            scope.chartConfig.chart.width = scope.options.width - 10;
          });
        }
      };
    }
  };
});
