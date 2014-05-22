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
      close: '&onClose',
      options: '=?' // settings as single object, useful for loading persisted state
    },
    link: {
      // runs before nested directives, see http://stackoverflow.com/a/18491502
      pre: function (scope) {
        scope.options = scope.options || {};

        scope.visualization = scope.options.visualization || {
          name: 'table'
        };

        scope.aggData = [
          //{ key: 'One',   value: Math.floor(Math.random()*20) } -- pie
          //{ key: 'Series', values:[{ key: 'One',   value: Math.floor(Math.random()*20) }]} -- bar
        ];

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

        scope.pivot = scope.options.pivot || {
          rows: [],
          cols: []
        };

        scope.pivotOptions = [
          {
            value: 'sex',
            label: gettextCatalog.getString('Sex')
          },
          {
            value: 'age',
            label: gettextCatalog.getString('Age')
          },
          {
            value: 'symptoms',
            label: gettextCatalog.getString('Symptoms')
          }
        ];

        // strings that we can't translate in the view, usually because they're in attributes
        scope.strings = {
          date: gettextCatalog.getString('Date'),
          sex: gettextCatalog.getString('Sex'),
          age: gettextCatalog.getString('Age'),
          symptoms: gettextCatalog.getString('Symptoms'),
          edit: gettextCatalog.getString('Edit')
        };

        scope.$on('export', function () {
          if (scope.visualization.name === 'line') {
            // let timeSeries directive handle it
            return;
          }

          visualization.save(visualization.state(scope));
        });

        var buildAggregation = function (field) {
          var agg = {};
          agg[field] = outpatientAggregation.getAggregation(field, 10);
          return agg;
        };

        //assuming only two deep for now..
        var buildAggregationQuery = function (cols, rows) {
          var query, first, second;
          if (cols[0]) {
            first = cols[0];
            if (rows[0]) {
              second = rows[0];
            }
          } else if (rows[0]) {
            first = rows[0];
          }
          //build first aggregation
          if (first) {
            query = buildAggregation(first);
            //if a second exists, add to first aggregation object
            if (second) {
              query[first].aggs = buildAggregation(second);
            }
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
                /*jshint camelcase:false */
                missingCount -= entry.doc_count;
                slice = {col: col, colName: keyStr, key: keyStr, value: entry.doc_count};
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
                /*jshint camelcase:false */
                missingCount -= entry.doc_count;
                slice = {row: row, rowName: keyStr, key: keyStr, value: entry.doc_count};
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
                /*jshint camelcase:false */
                missingTotalCount -= entry.doc_count;
                var missingCount = entry.doc_count;
                var data = [];
                entry[row].buckets.map(function (sub) {
                  var subStr = outpatientAggregation.bucketToKey(sub);
                  missingCount -= sub.doc_count;
                  slice = {col: col, colName: entry.key, row: row, rowName: sub.key,
                    key: (keyStr + '_' + subStr), value: sub.doc_count};
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
          if (event.point.col && !event.point.colName.startsWith('missing')) {
            filter = {
              type: event.point.col,
              value: event.point.colName
            };
            $rootScope.$emit('filterChange', filter, true, true);
          }
          if (event.point.row && !event.point.rowName.startsWith('missing')) {
            filter = {
              type: event.point.row,
              value: event.point.rowName
            };
            $rootScope.$emit('filterChange', filter, true, true);
          }
        });

        scope.tableFilter = function (field, value) {
          //TODO multiselect if value.length > ?
          if (value) {
            var a = [].concat(value);
            a.forEach(function (v) {
              var filter = {
                type: field,
                value: v
              };
              $rootScope.$emit('filterChange', filter, true, false);
            });
          }
        };
      }
    }
  };
});
