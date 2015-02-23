'use strict';

var angular = require('angular');
var moment = require('moment');
var directives = require('../scripts/modules').directives;

angular.module(directives.name).directive('outpatientPieChart', /*@ngInject*/ function ($rootScope, debounce, updateURL, //
                                                                                        gettextCatalog, EditSettings, $location) {
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
          scope.options.labels = scope.options.labels || {title: gettextCatalog.getString('Pie Chart')};

          scope.$on('editVisualizationSettings', function () {
            EditSettings.openSettingsModal('pie', scope.options.labels)
              .result.then(function (labels) {
                scope.options.labels = labels;
              });
          });

          scope.refresh = false;

          scope.chartConfig = {
            options: {
              chart: {
                plotBackgroundColor: null,
                plotShadow: false,
                type: 'pie'
              },
              tooltip: {
                pointFormat: 'Count: <b>{point.y}</b>'
              },
              exporting: {enabled: false},
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
                          col: null
                        };

                        if (this.series.options.id == 'cols') {
                          point.col = this.col
                        } else {
                          point.col = this.series.name
                        }

                        narrowFilters(point);
                      }
                    }
                  }
                }
              }
            },
            title: {
              text: scope.options.labels.title
            },
            series: [],
            size: {
              width: scope.options.width,
              height: scope.options.height
            }
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

          var reload = function () {
            debounce(reloadDebounce, 200).call();
          };

          var reloadDebounce = function () {

            scope.chartConfig.series = [];

            if (scope.pivot.cols.length > 0) {

              var innerData = scope.aggData.concat();

              for (var i = 0; i < innerData.length; i++) {
                innerData[i].name = innerData[i].colName;
                innerData[i].y = innerData[i].value;
              }

              var series = [];
              var inner = [];
              var outer = [];

              for (var i = 0; i < innerData.length; i++) {
                var found = false;

                for (var j = 0; j < inner.length; j++) {
                  if (innerData[i].colName == inner[j].colName) {
                    inner[j].y = inner[j].y + innerData[i].y;
                    found = true;
                    break;
                  }
                }

                if (found == false) {
                  inner.push(innerData[i]);
                }
              }

              series.push({
                id: 'cols',
                name: innerData[0].col,
                data: inner,
                size: '80%',
                dataLabels: {
                  formatter: function () {
                    return this.y > 5 ? this.point.name : null;
                  },
                  color: 'white',
                  distance: -30
                }
              });

              if (scope.pivot.rows.length > 0) {
                for (var x = 0; x < scope.aggData.length; x++) {
                  outer.push({
                    name: scope.aggData[x].rowName,
                    y: scope.aggData[x].value
                  });
                }

                series.push({
                  id: 'rows',
                  name: scope.aggData[0].row,
                  data: outer,
                  size: '100%',
                  innerSize: '80%'
                });
              } else {
                series[0].dataLabels = {
                  enabled: true,
                  format: '<b>{point.name}</b>',
                  style: {
                    color: (Highcharts.theme && Highcharts.theme.contrastTextColor) || 'black'
                  }
                };
                series[0].size = '100%';
              }
              scope.chartConfig.series = series;
            }
          };

          var narrowFilters = function (point) {
            var filter = {
              filterID: point.col,
              value: point.name
            };
            $rootScope.$emit('filterChange', filter, true, true);
          };

          scope.$watchCollection('[aggData]', function () {
            reload();
          });

          scope.$watch('options.labels.title', function () {
            scope.chartConfig.title.text = scope.options.labels.title;
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
