'use strict';

var angular = require('angular');
var directives = require('../scripts/modules').directives;

angular.module(directives.name).directive('outpatientVisualization', function ($http, $modal, orderByFilter, gettextCatalog, sortString, FrableParams, OutpatientVisit, outpatientEditModal, outpatientDeleteModal, outpatientAggregation, visualization, $rootScope) {

  return {
    restrict: 'E',
    template: require('./visualization.html'),
    scope: {
      filters: '=',
      queryString: '=', // TODO use filters instead
      visualization: '=?',
      pivot: '=?',
      options: '=?' // settings as single object, useful for loading persisted state
    },
    link: {
      // runs before nested directives, see http://stackoverflow.com/a/18491502
      pre: function (scope) {
        scope.options = scope.options || {};

        scope.visualization = scope.visualization || scope.options.visualization || {
          name: 'table'
        };

        scope.pivot = scope.pivot || scope.options.pivot || {
          rows: [],
          cols: []
        };

        scope.aggData = [
          //{ key: 'One',   value: Math.floor(Math.random()*20) } -- pie
          //{ key: 'Series', values:[{ key: 'One',   value: Math.floor(Math.random()*20) }]} -- bar
        ];

        scope.crosstabData = [];

        scope.xFunction = function () {
          return function (d) {
            return d.key;
          };
        };
        scope.yFunction = function () {
          return function (d) {
            return d.value;
          };
        };

        // strings that we can't translate in the view, usually because they're in attributes
        scope.strings = {
          date: gettextCatalog.getString('Date'),
          district: gettextCatalog.getString('District'),
          sex: gettextCatalog.getString('Sex'),
          age: gettextCatalog.getString('Age'),
          symptoms: gettextCatalog.getString('Symptoms'),
          diagnoses: gettextCatalog.getString('Diagnoses'),
          syndromes: gettextCatalog.getString('Syndromes'),
          visitType: gettextCatalog.getString('Visit type'),
          discharge: gettextCatalog.getString('Discharge type'),
          edit: gettextCatalog.getString('Edit')
        };

        scope.$on('export', function () {
          if (scope.visualization.name === 'line') {
            // let timeSeries directive handle it
            return;
          }

          visualization.save(visualization.state(scope));
        });

        //assuming only two deep for now..
        var buildAggregationQuery = function (cols, rows) {
          var first, second;
          var query = {};
          if (cols[0]) {
            first = cols[0];
            if (rows[0]) {
              second = rows[0];
            }
          } else if (rows[0]) {
            first = rows[0];
          }
          //build first aggregation
          if (first && second) {
            query[first] = outpatientAggregation.getAggregation(first, false, 10);
            //if a second exists, add to first aggregation object
            query[first].aggs = {};
            query[first].aggs[second] = outpatientAggregation.getAggregation(second, true, 10);
          }else if(first){
            query[first] = outpatientAggregation.getAggregation(first, true, 10);
          }
          return query;
        };

        //assuming only two deep BY one for now...
        var parseAggQuery = function (aggregation, cols, rows) {
          var aggs = aggregation.aggregations;

          var col = cols[0];
          var colLabel = scope.strings[col] || col;

          var row = rows[0];
          var rowLabel = scope.strings[row] || row;

          var pieData = []; //{ col: col, key: col, value: count }
          var barData = []; //{ col: col, key: keyStr, values: [{col: col, key: keyStr, value: count}]}...
          var missingCount = aggregation.total;
          var slice;
          if (aggs) {
            //if there is only one aggregation selected parse as normal
            if (col && !row) {
              aggs[col].buckets.map(function (entry) {
                var keyStr = outpatientAggregation.bucketToKey(entry);
                var count = entry.count ? entry.count.value : entry.doc_count; //TODO triple check this
                /*jshint camelcase:false */
                missingCount -= count;
                slice = {col: col, colName: keyStr, key: keyStr, value: count};
                pieData.push(slice);
                barData.push({col: col, colName: keyStr, key: keyStr, values: [slice]});
              });
              //add missing fields count from total hits - aggs total doc count
              if (missingCount > 0) {
                slice = {col: col, colName: 'missing', key: ('missing_' + col), value: missingCount};
                pieData.push(slice);
                barData.push({col: col, colName: 'missing', key: ('missing_' + col), values: [slice]});
              }
            }
            if (!col && row) {
              aggs[row].buckets.map(function (entry) {
                var keyStr = outpatientAggregation.bucketToKey(entry);
                var count = entry.count ? entry.count.value : entry.doc_count; //TODO triple check this
                /*jshint camelcase:false */
                missingCount -= count;
                slice = {row: row, rowName: keyStr, key: keyStr, value: count};
                pieData.push(slice);
              });
              //add missing fields count from total hits - aggs total doc count
              if (missingCount > 0) {
                slice = {row: row, rowName: 'missing', key: ('missing_' + rowLabel), value: missingCount};
                pieData.push(slice);
              }
              barData.push({row: row, key: rowLabel, values: pieData});
            }
            //if there are two aggregations parse and return as agg1-agg2..
            if (col && row) {
              var missingTotalCount = aggregation.total;//aggs[cols[0]].buckets.doc_count;
              aggs[col].buckets.map(function (entry) {
                var keyStr = outpatientAggregation.bucketToKey(entry);
                var count = entry.count ? entry.count.value : entry.doc_count; //TODO triple check this
                /*jshint camelcase:false */
                missingTotalCount -= count;
                var missingCount = count;
                var data = [];
                entry[row].buckets.map(function (sub) {
                  var subStr = outpatientAggregation.bucketToKey(sub);
                  var scount = sub.count ? sub.count.value : sub.doc_count; //TODO triple check this
                  missingCount -= scount;
                  slice = {col: col, colName: entry.key, row: row, rowName: sub.key,
                    key: (keyStr + '_' + subStr), value: scount};
                  data.push(slice);
                  pieData.push(slice);
                });
                //add missing fields count from total hits - aggs total doc count
                if (missingCount > 0) {
                  slice = {col: col, colName: entry.key, row: row, rowName: 'missing',
                    key: ('missing_' + keyStr + '_' + rowLabel), value: missingCount};
                  data.push(slice);
                  pieData.push(slice);
                }
                barData.push({key: keyStr, values: data});
              });
              //add missing fields count from total hits - aggs total doc count
              if (missingTotalCount > 0) {
                slice = {col: col, colName: 'missing', key: ('missing_' + colLabel), value: missingTotalCount};
                barData.push({col: col, colName: 'missing', key: ('missing_' + colLabel), values: [slice]});
                pieData.push(slice);
              }
            }
            if (scope.visualization.name === 'bar') {
              return barData;
            } else if (scope.visualization.name === 'pie') {
              return pieData;
            } else if (scope.visualization.name === 'map') {
              return pieData;
            }
          }
          return [];
        };

        var aggReload = function () {
          var cols = angular.copy(scope.pivot.cols);
          var rows = angular.copy(scope.pivot.rows);
          //query the new data for aggregations
          OutpatientVisit.search({
            size: 0,
            q: scope.queryString,
            aggregations: buildAggregationQuery(cols, rows)
          }, function (data) {
            scope.aggData = parseAggQuery(data, cols, rows);
          });
        };

        var reload = function () {
          if (scope.visualization.name === 'table') {
            scope.tableParams.reload();
          } else if (scope.visualization.name === 'pie') {
            aggReload();
          } else if (scope.visualization.name === 'bar') {
            aggReload();
          } else if (scope.visualization.name === 'map') {
            aggReload();
          } else if (scope.visualization.name === 'crosstab') {
            // TODO do this via aggregation
            OutpatientVisit.get({
              size: 999999,
              q: scope.queryString
            }, function (data) {
              scope.crosstabData = data.results.map(function (r) {
                var source = r._source;
                return {
                  sex: source.patient ? source.patient.sex : null,
                  age: source.patient ? source.patient.age : null,
                  symptoms: source.symptoms,
                  diagnoses: source.diagnoses,
                  districts: source.districts
                };
              });
            });
          }
        };

        scope.editVisit = function (record) {
          outpatientEditModal.open({
            record: record
          })
            .result
            .then(function () {
              reload(); // TODO highlight changed record
            });
        };
        scope.deleteVisit = function (record) {
          outpatientDeleteModal.open({record: record})
            .result
            .then(function () {
              reload();
            });
        };

        scope.tableParams = new FrableParams({
          page: 1,
          count: 10,
          sorting: {
            reportDate: 'desc'
          }
        }, {
          total: 0,
          counts: [], // hide page count control
          $scope: {
            $data: {}
          },
          getData: function ($defer, params) {
            if (!angular.isDefined(scope.queryString)) {
              // Wait for queryString to be set before we accidentally fetch a bajillion rows we don't need.
              // If you really don't want a filter, set queryString='' or null
              // TODO there's probably a more Angular-y way to do this
              $defer.resolve([]);
              return;
            }

            OutpatientVisit.get({
              q: scope.queryString,
              from: (params.page() - 1) * params.count(),
              size: params.count(),
              sort: sortString.toElasticsearchString(params.orderBy()[0]) // we only support one level of sorting
            }, function (data) {
              params.total(data.total);
              $defer.resolve(data.results);
            }, function error (response) {
              $rootScope.$broadcast('filterError', response);
            });
          }
        });

        scope.$watch('queryString', function () {
          reload();
        });
        scope.$watch('pivot.cols', function () {
          reload();
        });
        scope.$watch('pivot.rows', function () {
          reload();
        });
        scope.$watch('visualization.name', function () {
          reload();
        });

        scope.$on('elementClick.directive', function (angularEvent, event) {
          var filter;
          if (event.point.col && event.point.colName.indexOf('missing') !== 0) {
            filter = {
              filterId: event.point.col,
              value: event.point.colName
            };
            $rootScope.$emit('filterChange', filter, true, true);
          }
          if (event.point.row && event.point.rowName.indexOf('missing') !== 0) {
            filter = {
              filterId: event.point.row,
              value: event.point.rowName
            };
            $rootScope.$emit('filterChange', filter, true, true);
          }
        });

        scope.printAggregate = function(field, includeCount){
          var print = [];
          if(field){
            field.map(function(val){
              print.push(val.name + (includeCount ? ('(' + val.count + ')') : ''));
            });
          }
          return print.join(',');
        };

        scope.tableFilter = function (field, value) {
          //TODO multiselect if value.length > ?
          if (value || value === false) {
            var a = [].concat(value);
            a.forEach(function (v) {
              var filter = {
                filterId: field,
                value: ((typeof v) === 'object' ? v.name : v)
              };
              $rootScope.$emit('filterChange', filter, true, false);
            });
          }
        };

        scope.pluckNames = function (vals) {
          var res = '';
          if (vals !== undefined && vals !== null) {
            for (var i = 0; i < vals.length; i++) {
              res = res + ', ' +vals[i].name;
            }
          }
          if(res.length > 2){
            res = res.substring(2);
          }
          return res;
        };
      }
    }
  };
});
