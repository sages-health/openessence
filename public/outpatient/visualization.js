'use strict';

var angular = require('angular');
var directives = require('../scripts/modules').directives;
var moment = require('moment');

angular.module(directives.name).directive('outpatientVisualization', /*@ngInject*/ function ($modal, $rootScope, $log, orderByFilter, gettextCatalog, sortString, FrableParams, OutpatientVisitResource, outpatientEditModal, updateURL, outpatientDeleteModal, scopeToJson, outpatientAggregation, visualization) {

  return {
    restrict: 'E',
    template: require('./visualization.html'),
    scope: {
      filters: '=',
      form: '=?',
      queryString: '=', // TODO use filters instead
      visualization: '=?',
      pivot: '=?',
      options: '=?', // settings as single object, useful for loading persisted state
      source: '=?',
      widget: '=?'
    },
    link: {
      // runs before nested directives, see http://stackoverflow.com/a/18491502
      pre: function (scope, element) {

        console.log(scope.visualization);

        scope.options = scope.options || {};
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

        var sortByName =  function (a, b) {
          var a1 = a.name || a || '';
          var b1 = b.name || b || '';
          return a1 > b1;
        };

        scope.printAggregate = function (field, showCount) {
          var includeCount = showCount || scope.form.dataType === 'aggregate';
          var print = [];
          if (field) {
            field.sort(sortByName).map(function (val) {
              print.push(val.name + (includeCount ? ('(' + val.count + ')') : ''));
            });
          }
          return print.join(',');
        };

        scope.$on('visualizationNameChanged', function () {
          delete scope.options.labels;
          updateVisualization();
        });

        scope.$on('exportVisualization', function () {
          if (scope.visualization.name === 'line') {
            // let timeSeries directive handle it
            return;
          } else if (scope.visualization.name === 'table') {
            visualization.csvExport(scope.queryString);
            return;
          }

          // Don't include es documents in our document. Elasticsearch throws a nasty exception if you do.
          var state = scopeToJson(scope);
          var arr = ['data', 'crosstabData'];
          angular.forEach(arr, function (k) {
            delete state[k];
          });
          if (state.tableParams) {
            delete state.tableParams.data;
          }

          state.source = 'export';

          visualization.export(state);
        });

        scope.$on('saveVisualization', function () {
          if (scope.visualization.name === 'line') {
            // let timeSeries directive handle it
            return;
          }

          // Don't include es documents in our document. Elasticsearch throws a nasty exception if you do.
          var state = scopeToJson(scope);
          var arr = ['data', 'crosstabData'];
          angular.forEach(arr, function (k) {
            delete state[k];
          });
          if (state.tableParams) {
            delete state.tableParams.data;
          }

          visualization.save(state);
        });


        //assuming only two deep BY one for now...
        var parseAggQuery = function (aggregation, first, second) {
          //$log.log('parsing agg query');
          /*jshint camelcase:false */
          var aggs = aggregation.aggregations;
          //$log.log(aggs);
          var colLabel = first;
          var rowLabel = second;

          var fa = 'first';
          var sa = 'second';

          var pieData = []; //{ col: col, key: col, value: count }
          var barData = []; //{ col: col, key: keyStr, values: [{col: col, key: keyStr, value: count}]}...
          var missingCount = aggregation.total;
          var slice, bucket;
          if (aggs) {
            //if there is only one aggregation selected parse as normal
            if (first && !second) {
              bucket = aggs[fa].buckets || aggs[fa]._name.buckets;
              bucket = outpatientAggregation.toArray(bucket);
              bucket.map(function (entry) {
                var keyStr = entry.key;
                var count = entry.count ? entry.count.value : entry.doc_count;
                missingCount -= count;
                slice = {col: first, colName: keyStr, key: keyStr, value: count};
                pieData.push(slice);
                barData.push({col: first, colName: keyStr, key: keyStr, values: [slice]});
              });
              //add missing fields count from total hits - aggs total doc count
              if (missingCount > 0) {
                slice = {col: first, colName: 'missing', key: ('missing_' + colLabel), value: missingCount};
                pieData.push(slice);
                barData.push({col: first, colName: 'missing', key: ('missing_' + colLabel), values: [slice]});
              }
            }
            if (!first && second) {
              bucket = aggs[sa].buckets || aggs[sa]._name.buckets;
              bucket = outpatientAggregation.toArray(bucket);
              bucket.map(function (entry) {
                var keyStr = entry.key;
                var count = entry.count ? entry.count.value : entry.doc_count;
                /*jshint camelcase:false */
                missingCount -= count;
                slice = {row: second, rowName: keyStr, key: keyStr, value: count};
                pieData.push(slice);
              });
              //add missing fields count from total hits - aggs total doc count
              if (missingCount > 0) {
                slice = {row: second, rowName: 'missing', key: ('missing_' + rowLabel), value: missingCount};
                pieData.push(slice);
              }
              barData.push({row: second, key: rowLabel, values: pieData});
            }
            //if there are two aggregations parse and return as agg1-agg2..
            if (first && second && aggs[fa] && (aggs[fa].buckets || aggs[fa]._name)) {
              var missingTotalCount = aggregation.total;//aggs[cols[0]].buckets.doc_count;
              bucket = aggs[fa].buckets || aggs[fa]._name.buckets;
              bucket = outpatientAggregation.toArray(bucket);
              bucket.map(function (entry) {
                var keyStr = entry.key;
                var count = entry.count ? entry.count.value : entry.doc_count;
                /*jshint camelcase:false */
                missingTotalCount -= count;
                var missingCount = count;
                var data = [];
                var subBucket = entry[sa].buckets || entry[sa]._name.buckets;
                subBucket = outpatientAggregation.toArray(subBucket);
                subBucket.map(function (sub) {
                  var subStr = sub.key;
                  var scount = sub.count ? sub.count.value : sub.doc_count;
                  missingCount -= scount;
                  slice = {
                    col: first, colName: entry.key, row: second, rowName: sub.key,
                    key: (keyStr + '_' + subStr), value: scount
                  };
                  data.push(slice);
                  pieData.push(slice);
                });
                //add missing fields count from total hits - aggs total doc count
                if (missingCount > 0) {
                  slice = {
                    col: first, colName: entry.key, row: second, rowName: 'missing',
                    key: ('missing_' + keyStr + '_' + rowLabel), value: missingCount
                  };
                  data.push(slice);
                  pieData.push(slice);
                }
                barData.push({key: keyStr, values: data});
              });
              //add missing fields count from total hits - aggs total doc count
              if (missingTotalCount > 0) {
                slice = {col: first, colName: 'missing', key: ('missing_' + colLabel), value: missingTotalCount};
                barData.push({col: first, colName: 'missing', key: ('missing_' + colLabel), values: [slice]});
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
          //TODO: nested aggs (symptoms etc.) must be first?
          var agg = outpatientAggregation.buildAggregationQuery(cols, rows, 10, scope.form);
          //query the new data for aggregations
          OutpatientVisitResource.search({
            size: 0,
            q: scope.queryString,
            aggregations: agg.query
          }, function (data) {
            scope.aggData = parseAggQuery(data, agg.first, agg.second);
          });
        };

        //TODO this is due to local aggregation for crosstab, should utilize backend
        var crosstabifyRecord = function (source) {
          var record = {};
          angular.forEach(scope.fields, function (field, key) {
            if (field.enabled) {
              if(field.isGroup === true){
                this[key] = outpatientAggregation.getGroup(source, field);
              } else {
                var prop = key.split('.').reduce(function (obj, i) { //traverse down parent.child.prop key
                  return obj ? obj[i] : undefined;
                }, source);
                this[key] = prop && prop.name ? prop.name : (prop || 'Missing-' + key); //TODO extract text
              }
            }
          }, record);
          return record;
        };

        var flattenAggregateRecord = function (record, flatRecs) {
          //currently we explode symptoms, symptomsGroup, diagnoses and diagnosesGroup to make crosstab counts for them happy
          var explodeFields = ['symptoms', 'diagnoses', 'symptomsGroup', 'diagnosesGroup'];
          var rec = angular.copy(record);

          var allNull = true;
          angular.forEach(explodeFields, function (fld) {
            allNull = allNull && !rec[fld];
            delete rec[fld];
          });

          angular.forEach(explodeFields, function (fld) {
            if (record[fld]) {
              var data = record[fld].sort(sortByName);
              angular.forEach(data, function (v) {
                var r = angular.copy(rec);
                var count = (v.count !== undefined) ? v.count : 1;
                r[fld] = [
                  {name: v.name || v, count: count}
                ];
                flatRecs.push(r);
              });
            }
          });
          if (allNull) {
            flatRecs.push(rec);
          }
        };

        var uniqueStrings = function (value, index, self) {
          return self.indexOf(value) === index;
        };

        var flattenIndividualRecord = function (record, flatRecs) {
          //sort symptoms, diagnoses
          var fields = ['symptoms', 'diagnoses'];
          // grab distinct values, sort them and join using comma for symptomGroups and diagnosesGroup
          angular.forEach(fields, function (fld) {
            if (record[fld] && angular.isArray(record[fld])) {
              record[fld] = record[fld].sort(sortByName);
            }
          });

          var groupFields = ['symptomsGroup', 'diagnosesGroup'];
          // grab distinct values, sort them and join using comma for symptomGroups and diagnosesGroup
          angular.forEach(groupFields, function (fld) {
            if (record[fld]) {
              record[fld] = record[fld].map(function (v) {
                return v.name;
              }).filter(uniqueStrings).sort().join(', ');
            }
          });
          flatRecs.push(record);
        };

        var reload = function () {
          if (scope.visualization.name === 'table') {
            //scope.tableParams.reload();
          } else if (scope.visualization.name === 'pie') {
            aggReload();
          } else if (scope.visualization.name === 'bar') {
            aggReload();
          } else if (scope.visualization.name === 'map') {
            aggReload();
          } else if (scope.visualization.name === 'crosstab') {
            // TODO do this via aggregation
            OutpatientVisitResource.get({
              size: 999999,
              q: scope.queryString
            }, function (data) {
              var records = [];
              //TODO add missing count, remove 0 from flattened records
              angular.forEach(data.results, function (r) {
                var rec = crosstabifyRecord(r._source);
                if (scope.form.dataType === 'aggregate') {
                  //flatten symptoms/diagnoses/symptomsGroup/diagnosesGroup
                  flattenAggregateRecord(rec, records);
                } else {
                  flattenIndividualRecord(rec, records);

                }
              });
              scope.crosstabData = records;
            });
          }
        };


        scope.$on('outpatientEdit', function (event, visit) {
          outpatientEditModal.open({record: visit, form: scope.form})
            .result
            .then(function () {
              //reload(); // TODO highlight changed record
              $rootScope.$broadcast('outpatientVisit.edit');
            });
        });
        scope.$on('outpatientDelete', function (event, visit) {
          outpatientDeleteModal.open({record: visit})
            .result
            .then(function () {
              //reload();
              $rootScope.$broadcast('outpatientVisit.edit');
            });
        });

        scope.getWeek = function (date) {
          return moment(date).format('W');
        };
        scope.getYear = function (date) {
          return moment(date).format('GGGG');
        };

        scope.$watch('queryString', function () {
          updateURL.updateFilters(scope.filters);
          reload();
        });

        var updateVisualization = function () {
          delete scope.options.options;
          updateURL.updateVisualization(scope.options.id, {
            options: scope.options,
            pivot: scope.pivot,
            rows: scope.pivot.rows || [],
            series: scope.pivot.cols || [],
            visualization: scope.visualization
          });

        };

        scope.$watch('pivot.cols', function (newValue, oldValue) {
          if (newValue !== oldValue) {
            updateVisualization();
            reload();
          }
        });

        scope.$watch('pivot.rows', function (newValue, oldValue) {
          if (newValue !== oldValue) {
            updateVisualization();
            reload();
          }
        });

        scope.$watch('visualization.name', function (newValue, oldValue) {
          if (newValue !== oldValue) {
            updateVisualization();
            reload();
          }
        });

        scope.$on('outpatientVisit.edit', function (angularEvent, event) {
          reload();
        });

        scope.$on('elementClick.directive', function (angularEvent, event) {
          var filter;
          if (event.point.col && event.point.colName.indexOf('missing') !== 0) {
            filter = {
              filterID: event.point.col,
              value: event.point.colName
            };
            $rootScope.$emit('filterChange', filter, true, true);
          }
          if (event.point.row && event.point.rowName.indexOf('missing') !== 0) {
            filter = {
              filterID: event.point.row,
              value: event.point.rowName
            };
            $rootScope.$emit('filterChange', filter, true, true);
          }
        });



        scope.tableFilter = function (field, value) {
          //TODO multiselect if value.length > ?
          if (value || value === false) {
            var a = [].concat(value);
            angular.forEach(a, function (v) {
              var filter = {
                filterID: field,
                value: ((typeof v) === 'object' ? v.name : v)
              };
              $rootScope.$emit('filterChange', filter, true, false);
            });
          }
        };
      }
    }
  };
});
