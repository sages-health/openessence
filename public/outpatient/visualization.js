'use strict';

var angular = require('angular');
var directives = require('../scripts/modules').directives;
var moment = require('moment');

var $ = require('jquery');
require('../crosstab/pivot');

angular.module(directives.name).directive('outpatientVisualization', /*@ngInject*/ function ($modal, $rootScope, $log, debounce, orderByFilter, gettextCatalog, sortString, FrableParams, OutpatientVisitResource, outpatientEditModal, updateURL, outpatientDeleteModal, scopeToJson, outpatientAggregation, visualization, stringUtil) {

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

        scope.pivotOptions = scope.pivotOptions || scope.options.pivotOptions || {
          rows: [],
          cols: []
        };

        scope.aggData = [
          //{ key: 'One',   value: Math.floor(Math.random()*20) } -- pie
          //{ key: 'Series', values:[{ key: 'One',   value: Math.floor(Math.random()*20) }]} -- bar
        ];

        scope.crosstabData = [];

        scope.printAggregate = function (field, showCount) {
          var includeCount = showCount || scope.form.dataType === 'aggregate';
          var print = [];
          if (field) {
            field.sort(stringUtil.compare).map(function (val) {
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

        var plotSeries = function (seriesName, seriesType) {
          var res = !scope.filters;
          if (scope.filters) {
            var filters = scope.filters.filter(function (filter) {
              return filter.filterID === seriesType && filter.value.length > 0;
            });

            res = res || filters.length === 0;

            for(var i = 0; i < filters.length; i++){
              res = res || filters[i].value.indexOf(seriesName) !== -1;
            }
          }
          return res;
        };

        var getCrosstabularData = function (records, opts) {
          //TODO extra to service from crosstab.js
          var countKey = 'count';
          var sumcount = function (data, rowKey, colKey) {
            return {
              colk: colKey,
              rowk: rowKey,
              countStore: {},
              count: 0,
              push: function (record) {
                var col = scope.pivot.cols[0];
                var row = scope.pivot.rows[0];

                if (record[col]) {
                  if (typeof record[col] !== 'string') {
                    if (record[col][0] && record[col][0][countKey] !== undefined) {
                      this.count += record[col][0][countKey];
                      return;
                    }
                  }
                  this.count++;
                } else if (record[row]) {
                  if (typeof record[row] !== 'string') {
                    if (record[row][0] && record[row][0][countKey] !== undefined) {
                      this.count += record[row][0][countKey];
                      return;
                    }
                  }
                  this.count++;
                }
              },
              value: function () {
                return this.count;
              },
              format: function (x) {
                return x;
              },
              label: 'SumCount'
            };
          };

          var options = $.extend({
            cols: [],
            rows: [],
            filter: function () {
              return true;
            },
            aggregator: sumcount,
            //aggregator: $.pivotUtilities.aggregators.count(),
            derivedAttributes: {},
            localeStrings: {
              renderError: "An error occurred rendering the PivotTable results.",
              computeError: "An error occurred computing the PivotTable results."
            }
          }, opts);

          var pivotData = $.pivotUtilities.getPivotData(records,
            options.cols, options.rows, options.aggregator, options.filter, options.derivedAttributes);

          var barData = [];
          var pieData = [];
          var data = [];
          var keyStr, aggregator, count,total, slice;

          var rowField = pivotData.rowAttrs.join();
          var colField = pivotData.colAttrs.join();
          var rowKeys = pivotData.getRowKeys();
          var colKeys = pivotData.getColKeys();

          if (rowKeys.length > 0) {
            if (colKeys.length > 0) {//row and col
              angular.forEach(rowKeys, function (rowVal, rk) {
                data = [];
                angular.forEach(colKeys, function (colVal, ck) {
                  aggregator = pivotData.getAggregator(rowVal, colVal);
                  count = aggregator.value();
                  slice = {
                    col: rowField, colName: rowVal.join(), row: colField, rowName: colVal.join(),
                    key: (rowField + '_' + colField), value: count, total: pivotData.getAggregator([], colVal).value()
                  };
                  data.push(slice);
                  pieData.push(slice);
                });
                barData.push({key: rowField, values: data, total: pivotData.getAggregator(rowVal, []).value()});
              });
            } else {//just row
              //single selected
              angular.forEach(rowKeys, function (val, key) {
                keyStr = val.join();
                aggregator = pivotData.getAggregator(val, []);
                count = aggregator.value();
                total = pivotData.getAggregator([], []).value();
                //TODO do we diff pushing columns vs rows like in parseAggQuery now?
                slice = {col: rowField, colName: keyStr, key: keyStr, value: count, total: total};
                pieData.push(slice);
                barData.push({col: rowField, colName: keyStr, key: keyStr, values: [slice]});
              });
            }
          } else if (colKeys.length > 0) {//just col
            //single selected
            angular.forEach(colKeys, function (val, key) {
              keyStr = val.join();
              aggregator = pivotData.getAggregator([], val);
              count = aggregator.value();
              total = pivotData.getAggregator([], []).value();
              //TODO do we diff pushing columns vs rows like in parseAggQuery now?
              slice = {col: colField, colName: keyStr, key: keyStr, value: count, total: total};
              pieData.push(slice);
              barData.push({col: colField, colName: keyStr, key: keyStr, values: [slice]});
            });
          } else {//none

          }
          if (scope.visualization.name === 'bar') {
            return barData;
          } else if (scope.visualization.name === 'pie') {
            return pieData;
          } else if (scope.visualization.name === 'map') {
            return pieData;
          }
        };

        //assuming only two deep BY one for now...
        var parseAggQuery = function (aggregation, first, second, rows, cols) {
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
              if (first === cols[0] && first === rows[0]) { //selected both rows and cols
                //TODO WE DO NOT HAVE THE DATA WE NEED FROM ONE AGG QUERY RIGHT NOW
                //we need to filter plot the first, and add second
              }else {
                bucket = aggs[fa].buckets || aggs[fa]._name.buckets;
                bucket = outpatientAggregation.toArray(bucket);
                bucket.map(function (entry) {
                  //if series, and they didnt select row, then use filters for slices
                  var pivotOnSeries = (first === rows[0] && !cols[0]); //TODO change buildAggQuery so this is clearer
                  if (!pivotOnSeries || plotSeries(entry.key, first)) {
                    var keyStr = entry.key;
                    var count = entry.count ? entry.count.value : entry.doc_count;
                    missingCount -= count;
                    slice = {col: first, colName: keyStr, key: keyStr, value: count};
                    pieData.push(slice);
                    barData.push({col: first, colName: keyStr, key: keyStr, values: [slice]});
                  }
                });
                //add missing fields count from total hits - aggs total doc count
                if (missingCount > 0) {
                  slice = {col: first, colName: 'missing', key: ('missing_' + colLabel), value: missingCount};
                  pieData.push(slice);
                  barData.push({col: first, colName: 'missing', key: ('missing_' + colLabel), values: [slice]});
                }
              }
            }
            if (!first && second) {  //currently this does not occur?
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

        var queryData = function (resultFn) {
          OutpatientVisitResource.get({
            size: 999999,
            q: scope.queryString
          }, function (data) {
            var records = [];
            var seriesFilter = seriesFilters();

            //TODO add missing count, remove 0 from flattened records
            angular.forEach(data.results, function (r) {
              var rec = crosstabifyRecord(r._source);
              rec.visitDate = moment(rec.visitDate).format('YYYY-MM-DD');

              if (scope.form.dataType === 'aggregate') {
                //flatten symptoms/diagnoses/symptomsGroup/diagnosesGroup
                flattenAggregateRecord(rec, records);
              } else {
                flattenIndividualRecord(rec, records, seriesFilter);
              }
            });
            resultFn(records);
          });
        };

        var aggReload2 = function () {
          queryData(function (records) {
            //scope.crosstabData = records;
            var opts = {
              rows: angular.copy(scope.pivotOptions.rows) || [],
              cols: angular.copy(scope.pivotOptions.cols) || []
            };
            var cdata = getCrosstabularData(records, opts);
            scope.aggData = cdata;
          });
        };

        var aggReload = function () {
          var cols = angular.copy(scope.pivot.cols);
          var rows = angular.copy(scope.pivot.rows);
          var agg = outpatientAggregation.buildAggregationQuery(rows, cols, 10, scope.form);
          //query the new data for aggregations
          OutpatientVisitResource.search({
            size: 0,
            q: scope.queryString,
            aggregations: agg.query
          }, function (data) {
            scope.aggData = parseAggQuery(data, agg.first, agg.second, rows, cols);
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
          flattenRecord(record, flatRecs, explodeFields);
        };

        var flattenRecord = function (record, flatRecs, explodeFields) {
          var rec = angular.copy(record);

          var allNull = true;
          angular.forEach(explodeFields, function (fld) {
            allNull = allNull && !rec[fld];
            delete rec[fld];
          });

          angular.forEach(explodeFields, function (fld) {
            if (record[fld] && angular.isArray(record[fld])) {
              var data = record[fld].sort(stringUtil.compare);
              angular.forEach(data, function (v) {
                var r = angular.copy(rec);
                var count = (v.count !== undefined) ? v.count : 1;
                r[fld] = [
                  {name: v.name || v, count: count}
                ];
                flatRecs.push(r);
              });
            } else{
              flatRecs.push(rec);
            }
          });
          if (allNull) {
            flatRecs.push(rec);
          }
        };

        var uniqueStrings = function (value, index, self) {
          return self.indexOf(value) === index;
        };

        var addFilterGroups = function (record, filters) {

          var field = scope.pivot.rows[0];
          var values = record[field];
          var grpValue = [];

          //TODO: what if series is single value field sex, age etc...
          if(angular.isArray(values)) {

            // if we have series filter
            if (filters.length > 0) {
              filters.forEach(function (filter) {
                var flg = filter.every(function (v) {
                  return values.map(function (val) {
                      return val.name || val;
                    }).indexOf(v) > -1;
                });
                if (flg) {
                  grpValue.push(filter);
                }
              });
            }
            // add each value as an individual element to the filterGroup
            else {
              values.forEach(function (v) {
                grpValue.push([(v.name || v)]);
              });
            }
          } else {
            grpValue.push([values]);
          }

          grpValue = grpValue.map(function(v){
            return (v.name || v).join(', ');
          });

          record.filterGroup = grpValue;
        };


        var flattenIndividualRecord = function (record, flatRecs, seriesFilters) {
          //sort symptoms, diagnoses
          var multiValueFields = ['symptoms', 'diagnoses'];

          // sort symptoms and diagnoses
          angular.forEach(multiValueFields, function (fld) {
            if (record[fld] && angular.isArray(record[fld])) {
              record[fld] = record[fld].sort(stringUtil.compare);
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

          if (scope.pivot.rows && scope.pivot.rows.length > 0) {
            // Create filter group
            // If filter id match series ==> fever and cough or fever and rash
            // group will have array of and filters [[fever, cough], [fever, rash]]
            // else group will match symptom value [[fever], [cough], [rash]
            // record may have multiple filterGroups
            // if we have filter Fever & (Cold or Rash) and record has Fever, Cold, Rash ==>
            // this record will be mapped to two filterGroups [[Fever, Cold], [Fever, Rash]]
            addFilterGroups(record, seriesFilters);

            var tmpRecs = [];

            flattenRecord(record, tmpRecs, ['filterGroup']);

            if (scope.pivot.cols && scope.pivot.cols.length > 0 && multiValueFields.indexOf(scope.pivot.cols[0]) > -1) {
              tmpRecs.forEach(function (rec) {
                flattenRecord(rec, flatRecs, [scope.pivot.cols[0]]);
              });
            } else {
              tmpRecs.forEach(function (rec) {
                flatRecs.push(rec);
              });
            }

            scope.pivotOptions.rows = ['filterGroup'];
          } else {
            flatRecs.push(record);
          }


        };

        var cartesian = function (arg) {
          var r = [], max = arg.length - 1;

          function helper (arr, i) {
            for (var j = 0, l = arg[i].length; j < l; j++) {
              var a = arr.slice(0); // clone arr
              a.push(arg[i][j]);
              if (i === max) {
                r.push(a);
              } else {
                helper(a, i + 1);
              }
            }
          }

          helper([], 0);
          return r;
        };

        // return list of filters where filter id match with series (pivot column) id
        var seriesFilters = function () {
          var res = [];
          if (scope.filters && scope.pivot && scope.pivot.rows && scope.pivot.rows.length > 0) {
            var filters = scope.filters.filter(function (filter) {
              return filter.filterID !== 'visitDate' && filter.filterID === scope.pivot.rows[0] && filter.value.length > 0 && filter.value[0] !== '*';
            }).map(function (val) {
              return val.value;
            });

            if(filters.length > 0){
              res = cartesian(filters);
              // sort combination, if we have filter = (a "and" b)
              if(res.length > 0 && angular.isArray(res[0])) {
                res.forEach(function (v, i) {
                  res[i] = v.sort();
                });
              }
            }
          }

          return res;
        };

        var reload = function () {
          debounce(reloadDebounce, 500).call();
        };

        var reloadDebounce = function () {
          scope.pivotOptions = angular.copy(scope.pivot);

          if (scope.visualization.name === 'table') {
            //scope.tableParams.reload();
          } else if (scope.visualization.name === 'pie') {
            aggReload2();
          } else if (scope.visualization.name === 'bar') {
            aggReload2();
          } else if (scope.visualization.name === 'map') {
            aggReload2();
          } else if (scope.visualization.name === 'crosstab')
            queryData(function (records) {
              scope.crosstabData = records;
            });
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
            pivotOptions: scope.pivotOptions,
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
