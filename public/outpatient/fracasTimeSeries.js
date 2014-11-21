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
      source: '=?'
    },
    compile: function () {
      return {
        pre: function (scope) {

          var defaultLabels = {
            title: gettextCatalog.getString('Timeseries'),
            y: gettextCatalog.getString('Count'),
            x: gettextCatalog.getString('Date')
          };

          scope.options = scope.options || {};
          scope.options.labels = scope.options.labels || defaultLabels;

          scope.series = scope.series || scope.options.series || [];

          console.log(scope.series);

          scope.interval = scope.options.interval || 'day';

          scope.chartConfig = {
            options: {
              chart: {
                type: 'line'
              },
              credits: {
                enabled: false
              },
              exporting: {enabled: false}
            },
            xAxis: {
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
              width: scope.options.width,
              height: scope.options.height
            }
          };

          if (scope.source == 'export') {
            scope.chartConfig.options.exporting.enabled = true;
          }

          if (scope.series.length <= 0) {
            scope.chartConfig.options.colors = ['#7cb5ec'];
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
            scope.chartConfig.series = [];

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

                  scope.chartConfig.series.push(scope.data[0]);
                }
              }
            )
            ;
            //}
          };

          var extractCounts = function (agg) {
            var bucket = agg.buckets || agg._name.buckets;
            return bucket.map(function (b) {
              /*jshint camelcase:false */
              var count = b.count ? b.count.value : b.doc_count;
              return [b.key, count];
            });
          };

          function sortResults(a, b) {
            if (a[0] < b[0])
              return -1;
            if (a[0] > b[0])
              return 1;
            return 0;
          }

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
            console.log(scope.series);
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
  };
});
