'use strict';

var angular = require('angular');
var moment = require('moment');
var directives = require('../scripts/modules').directives;

angular.module(directives.name).directive('outpatientPieChart', /*@ngInject*/ function ($rootScope, updateURL, //
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
                plotShadow: false
              },
              tooltip: {
                pointFormat: '{series.name}: <b>{point.value}</b>'
              },
              exporting: {enabled: false},
              plotOptions: {
                pie: {
                  allowPointSelect: true,
                  cursor: 'pointer',
                  dataLabels: {
                    enabled: true,
                    format: '<b>{point.name}</b>',
                    style: {
                      color: (Highcharts.theme && Highcharts.theme.contrastTextColor) || 'black'
                    }
                  }
                },
                series: {
                  point: {
                    events: {
                      click: function () {
                        var point = {
                          name: this.name,
                          col: this.col
                        };

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

            scope.data = [];

            for (var i = 0; i < scope.aggData.length; i++) {
              scope.aggData[i].name = scope.aggData[i].colName;
              scope.aggData[i].y = scope.aggData[i].value;
            }

            scope.data.push({
              type: 'pie',
              name: scope.options.labels.title,
              data: scope.aggData
            });

            scope.chartConfig.series = scope.data;
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
