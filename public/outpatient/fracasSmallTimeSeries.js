'use strict';

var angular = require('angular');
var moment = require('moment');
var directives = require('../scripts/modules').directives;

angular.module(directives.name).directive('outpatientSmallTimeSeries', //
  /*@ngInject*/ function ($timeout, $window, gettextCatalog, outpatientAggregation, visualization, //
                          OutpatientVisitResource) {
    return {
      restrict: 'E',
      template: require('./mini-time-series.html'),
      scope: {
        options: '=?',
        height: '=?',
        width: '=?',
        queryString: '=',
        filters: '=',
        series: '=?' // array of strings denoting series to graph
      },
      compile: function () {
        return {
          pre: function (scope) {
            scope.options = scope.options || {};
            scope.series = scope.series || scope.options.series || [];
            scope.interval = scope.options.interval || 'day';
            scope.minDate = moment(scope.filters[0].from).valueOf();
            scope.maxDate = moment(scope.filters[0].to).valueOf();

            scope.chartConfig = {
              options: {
                chart: {
                  type: 'line',
                  height: 81,
                  width: 240
                },
                xAxis: {
                  type: 'datetime',
                  dateTimeLabelFormats: {
                    month: '%b'
                  },
                  tickInterval: 3600 * 1000 * 24 * 30,
                  labels: {
                    rotation: 90,
                    x: 3,
                    y: 6
                  }
                },
                yAxis: {
                  min: 0,
                  tickPixelInterval: 10,
                  title: {
                    text: null,
                    style: {
                      display: 'none'
                    }
                  },
                  gridLineColor: '#FFFFFF',
                  tickLength: 5,
                  lineWidth: 1
                },
                legend: {
                  enabled: false,
                  align: 'left',
                  verticalAlign: 'top',
                  layout: 'vertical',
                  floating: true,
                  padding: 2
                },
                plotOptions: {
                  line: {
                    marker: {
                      enabled: false
                    }
                  }
                },
                credits: {
                  enabled: false
                }
              },
              title: {
                text: null,
                style: {
                  display: 'none'
                }
              },
              series: [],
              loading: false
            };

            if (scope.options.filters[2].value[0] === 'LEGEND') {
              var legendVals = scope.options.filters[1].value;

              for (var i = 0; i < legendVals.length; i++) {
                var data = {};
                data.name = legendVals[i];
                data.data = [];
                scope.chartConfig.series.push(data);
              }
              scope.chartConfig.options.legend.enabled = true;
              scope.chartConfig.options.xAxis.lineWidth = 0;
              scope.chartConfig.options.yAxis.lineWidth = 0;
            }

            var reload = function () {
              if (scope.options.filters[2].value[0] !== 'LEGEND') {
                var aggs = {
                  date: {
                    'date_histogram': {
                      field: 'visitDate',
                      interval: scope.interval,
                      'min_doc_count': 0
                    }
                  }
                };

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
                        var data = {};
                        data.name = k;
                        data.data = [];
                        var startDate = [];
                        startDate.push(scope.minDate, null);
                        data.data.push(startDate);
                        for (var i = 0; i < dataStore[k].length; i++) {
                          var dateArray = [];
                          var date = dataStore[k][i][0];
                          dateArray.push(date, dataStore[k][i][1]);
                          data.data.push(dateArray);
                        }
                        var endDate = [];
                        endDate.push(scope.maxDate, null);
                        data.data.push(endDate);

                        data.data.sort(sortResults);

                        scope.chartConfig.series.push(data);
                      });

                    } else {
                      /*scope.data = [
                       {
                       key: gettextCatalog.getString('Outpatient visits'),
                       values: extractCounts(data.aggregations.date)
                       }
                       ];*/
                    }
                  }
                });
              }
            };

            function sortResults (a, b) {
              if (a[0] < b[0]) {
                return -1;
              }
              if (a[0] > b[0]) {
                return 1;
              }
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
              reload();
            });

          }
        };
      }
    };
  });
