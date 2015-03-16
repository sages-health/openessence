'use strict';

var angular = require('angular');
var services = require('../scripts/modules').services;
var moment = require('moment');

var $ = require('jquery');
require('../crosstab/pivot');


angular.module(services.name).factory('outpatientAggregation', /*@ngInject*/ function (gettextCatalog, possibleFilters, stringUtil) {

  var aggs = [];
  angular.forEach(possibleFilters.possibleFilters, function (value) {
    if (value.aggregation) {
      aggs.push({value: value.filterID, label: value.name});
    }
  });

  var getFormField = function (form, fieldName) {
    var field;
    if (form && form.fields) {
      angular.forEach(form.fields, function (fld) {
        if (fld.name === fieldName) {
          field = angular.copy(fld);
        }
      });
    }
    return field;
  };

  var getGroup = function (record, field) {
    if (!field.isGroup) {
      return null;
    }

    var res = null;

    // If field is ageGroup
    if (field.name === 'patient.ageGroup') {
      var years = 'patient.age.years'.split('.').reduce(function (obj, i) { //traverse down parent.child.prop key
        return obj ? obj[i] : undefined;
      }, record);
      res = getAgeGroup(years, field.values);
    } else {
      // value of the field which will be used to derive group name
      var value = field.possibleValuesFrom.split('.').reduce(function (obj, i) { //traverse down parent.child.prop key
        return obj ? obj[i] : undefined;
      }, record);

      // if it is an array, it should have name and count (symptoms, diagnoses)
      // get group name for each name
      if (angular.isArray(value)) {
        res = [];
        angular.forEach(value, function (val) {
          res.push({count: val.count, name: valueToGroup(val.name, field.values)});
        });
      }
      // medicalFacility
      else if (angular.isObject(value) && value.name) {
        res = valueToGroup(value.name, field.values);
      } else if (!angular.isUndefined(value)) {
        res = valueToGroup(value, field.values);
      }
    }
    if (res === null || angular.isUndefined(res)) {
      res = 'Missing-' + field.name;
    }

    return res;
  };

  // Maps a value to a group
  // Note: if there are multiple groups having this value, it will return first group that has it
  var valueToGroup = function (val, possibleValues) {
    if (val !== null && angular.isDefined(val)) {
      var i = 0;
      for (i = 0; i < possibleValues.length; i++) {
        if (possibleValues[i].value.indexOf(val) > -1) {
          return possibleValues[i].name;
        }
      }
    }
    return null;
  };

  // Maps an age to an age group
  var getAgeGroup = function (val, possibleValues) {
    if (val !== null && angular.isDefined(val)) {
      var i = 0;
      for (i = 0; i < possibleValues.length; i++) {
        if (val >= possibleValues[i].from && val < possibleValues[i].to) {
          return possibleValues[i].name;
        }
      }
    }
    return null;
  };

  var cartesian = function (arg) {
    var r = [], max = arg.length - 1;

    function helper(arr, i) {
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

  var plotSeries = function (seriesName, seriesType, scope) {
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

  //TODO this is due to local aggregation for crosstab, should utilize backend
  var crosstabifyRecord = function (source, fields) {
    var record = {};
    angular.forEach(fields, function (field, key) {
      if (field.enabled) {
        if (field.isGroup === true) {
          this[key] = getGroup(source, field);
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
      } else {
        flatRecs.push(rec);
      }
    });
    if (allNull) {
      flatRecs.push(rec);
    }
  };

  var flattenAggregateRecord = function (record, flatRecs) {
    //currently we explode symptoms, symptomsGroup, diagnoses and diagnosesGroup to make crosstab counts for them happy
    var explodeFields = ['symptoms', 'diagnoses', 'symptomsGroup', 'diagnosesGroup'];
    flattenRecord(record, flatRecs, explodeFields);
  };

  var uniqueStrings = function (value, index, self) {
    return self.indexOf(value) === index;
  };

  var addFilterGroups = function (record, filters, pivotRow, filterGroupName) {
    var values = record[pivotRow];
    var grpValue = [];

    //TODO: what if series is single value field sex, age etc...
    if (angular.isArray(values)) {

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

    grpValue = grpValue.map(function (v) {
      return (v.name || v).join(', ');
    });

    record[filterGroupName] = grpValue;
  };

  var flattenIndividualRecord = function (record, flatRecs, seriesFilters, scope) {
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
      if (angular.isArray(record[fld])) {
        record[fld] = record[fld].map(function (v) {
          return v.name;
        }).filter(uniqueStrings).sort().join(', ');
      }
    });

    if (scope.pivot.rows && scope.pivot.rows.length > 0) {
      var pivotRow = scope.pivot.rows[0] ;
      var filterGroupName = scope.pivot.rows[0] + '*';

      // Create filter group
      // If filter id match series ==> fever and cough or fever and rash
      // group will have array of and filters [[fever, cough], [fever, rash]]
      // else group will match symptom value [[fever], [cough], [rash]
      // record may have multiple filterGroups
      // if we have filter Fever & (Cold or Rash) and record has Fever, Cold, Rash ==>
      // this record will be mapped to two filterGroups [[Fever, Cold], [Fever, Rash]]
      addFilterGroups(record, seriesFilters, pivotRow, filterGroupName);

      var tmpRecs = [];

      flattenRecord(record, tmpRecs, [filterGroupName]);

      if (scope.pivot.cols && scope.pivot.cols.length > 0 && multiValueFields.indexOf(scope.pivot.cols[0]) > -1) {
        tmpRecs.forEach(function (rec) {
          flattenRecord(rec, flatRecs, [scope.pivot.cols[0]]);
        });
      } else {
        tmpRecs.forEach(function (rec) {
          flatRecs.push(rec);
        });
      }

      scope.pivotOptions.rows = [filterGroupName];
    } else {
      flatRecs.push(record);
    }
  };

  // return list of filters where filter id match with series (pivot column) id
  var seriesFilters = function (scope) {
    var res = [];
    if (scope.filters && scope.pivot && scope.pivot.rows && scope.pivot.rows.length > 0) {
      var filters = scope.filters.filter(function (filter) {
        return filter.filterID !== 'visitDate' && filter.filterID === scope.pivot.rows[0] && filter.value.length > 0 && filter.value[0] !== '*';
      }).map(function (val) {
        return val.value;
      });

      if (filters.length > 0) {
        res = cartesian(filters);
        // sort combination, if we have filter = (a "and" b)
        if (res.length > 0 && angular.isArray(res[0])) {
          res.forEach(function (v, i) {
            res[i] = v.sort();
          });
        }
      }
    }

    return res;
  };

  return {
    /**
     * @param data
     * @param scope [fields, form.dataType, pivot (adds pivotOptions)  ]
     * @returns {Array}
     */
    parseResults: function (data, scope) {
      var records = [];
      var seriesFilter = seriesFilters(scope);
      var fields = scope.fields || scope.options.fields;

      //TODO add missing count, remove 0 from flattened records
      angular.forEach(data.results, function (r) {
        var rec = crosstabifyRecord(r._source, fields);
        rec.visitMillis = moment(rec.visitDate).valueOf().toString();
        rec.visitWeek = moment(rec.visitDate).startOf('week').valueOf().toString();
        rec.visitISOWeek = moment(rec.visitDate).startOf('isoWeek').valueOf().toString();
        rec.visitMonth = moment(rec.visitDate).startOf('month').valueOf().toString();
        rec.visitQuarter = moment(rec.visitDate).startOf('quarter').valueOf().toString();
        rec.visitYear = moment(rec.visitDate).startOf('year').valueOf().toString();
        rec.visitDOY = moment(rec.visitDate).startOf('day').valueOf().toString();
        rec.visitDate = moment(rec.visitDate).format('YYYY-MM-DD');
        rec['patient.age'] = (null === rec['patient.age'].years) ? 'Missing-patient.age' : rec['patient.age'].years.toString();

        if (scope.form.dataType === 'aggregate') {
          //flatten symptoms/diagnoses/symptomsGroup/diagnosesGroup
          flattenAggregateRecord(rec, records);
        } else {
          flattenIndividualRecord(rec, records, seriesFilter, scope);
        }
      });
      return records;
    },
    getCrosstabularData: function (records, opts, scope) {
      //TODO extra from crosstab.js as well
      var countKey = 'count';
      var sumcount = function (data, rowKey, colKey) {
        return {
          colk: colKey,
          rowk: rowKey,
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
        //TODO: should be using count field aggregator
        //aggregator: sumcount,
        aggregator: $.pivotUtilities.aggregators.count(),
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
      var lineData = {};
      var data = [];
      var keyStr, aggregator, count, total, slice, label;

      var rowField = pivotData.rowAttrs.join();
      var colField = pivotData.colAttrs.join();
      var rowKeys = pivotData.getRowKeys();
      var colKeys = pivotData.getColKeys();

      if (rowKeys.length > 0) {
        if (colKeys.length > 0) {//row and col
          angular.forEach(rowKeys, function (rowVal, rk) {
            data = [];
            var label = gettextCatalog.getString(rowVal.join());
            if (!lineData[label]) {
              lineData[label] = [];
            }
            angular.forEach(colKeys, function (colVal, ck) {
              aggregator = pivotData.getAggregator(rowVal, colVal);
              count = aggregator.value();
              slice = {
                col: rowField, colName: rowVal.join(), row: colField, rowName: colVal.join(),
                key: (rowField + '_' + colField), value: count, total: pivotData.getAggregator([], colVal).value()
              };
              data.push(slice);
              pieData.push(slice);
              lineData[label].push({x: colVal[0], y: count});// dataStore[entry.key].push({x: d.key, y: count});
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
        var dateValue = {};
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

          //TODO: should be using count field in aggregation
          //to sum counts across one time period we need to add
          dateValue[val[0]] = count + (dateValue[val[0]] || 0);

        });

        //loop through and add time : count mapping as series for timeseries
        label = gettextCatalog.getString(colField);
        if (!lineData[label]) {
          lineData[label] = [];
        }
        angular.forEach(dateValue, function(val, key){
          lineData[label].push({x: key, y: val});
        });
      } else {//none

      }
      if (scope.visualization.name === 'line') {
        return lineData;
      }else if (scope.visualization.name === 'bar') {
        return barData;
      } else if (scope.visualization.name === 'pie') {
        return pieData;
      } else if (scope.visualization.name === 'map') {
        return pieData;
      }
    },
    getAggregables: function () {
      return angular.copy(aggs);
    },
    getAggregation: function (name, limit, form) {
      var filter = possibleFilters.possibleFilters[name];
      var copy = angular.copy(filter.aggregation);
      if (limit && copy.terms) {
        copy.terms.size = limit;
      }
      else if (filter.filterID === 'patient.ageGroup' && form && copy.range) {
        var fld = getFormField(form, name);
        var rangeDef = fld.values;
        var ranges = [];
        angular.forEach(rangeDef, function (group) {
          if (!angular.isNumber(group.from)) {
            console.error('Missing from for age group: ' + group.name);
          }
          if (!angular.isNumber(group.to)) {
            console.error('Missing to for age group: ' + group.name);
          }
          ranges.push({
            key: group.name,
            from: group.from,
            to: group.to
          });
        });
        copy.range.ranges = ranges;
      }

      // if filter is medicalFacilityGroup, symptomsGroup, diagnosesGroup, ect.
      else if (filter.type === 'group' && form) {
        var formField = getFormField(form, name);
        var groups = formField.values;
        var buckets = {};
        angular.forEach(groups, function (group) {
          buckets[group.name] = {terms: {}};
          buckets[group.name].terms[filter.aggregationField] = group.value;
        });
        // Field having string value
        // facilityGroup
        if (copy.filters) {
          copy.filters = { filters: buckets};
        }
        // Field having {name: x, count: x} array
        // symptomsGroup, diagnosesGroup...
        else if (copy.aggs && copy.aggs._name && copy.aggs._name.filters) {
          copy.aggs._name.filters = { filters: buckets};
        }
      }
      return copy;
    },
    /**
     * assuming only two deep for now..
     *
     * cols = symptoms --> shows data only for filtered results (e.g. fever only shows fever)
     * rows = symptoms --> shows all slices now filtered (counts for each slice)
     * cols = symptoms, rows = symptoms --> shows data for filtered results broken down by all results  (fever - [rash,cold,cough],...)
     *
     * //TODO for nested property X nested property we need to use reverse nested filter on 2nd property/bucket
     *
     *
     * @param series == series / first order bucket
     * @param cols == aggregation field/attribute (symptoms.count) / second order bucket
     * @param limit
     * @param form
     */
    buildAggregationQuery: function (series, cols, limit, form) {
      var first, second;
      var query = {};
      if (series[0]) {
        first = series[0];
        if (cols[0] && cols[0] !== first) {
          second = cols[0];
          //TODO if second is nested, we need to swap first/second and then custom parse
        }
      } else if (cols[0]) {
        first = cols[0];
      }
      //build first aggregation
      if (first && second) {
        query.first = this.getAggregation(first, limit, form);
        //if a second exists, add to first aggregation object
        query.first.aggs = {};
        query.first.aggs.second = this.getAggregation(second, limit, form);
      } else if (first) {
        query.first = this.getAggregation(first, limit, form);
      }
      return {query: query, first: first, second: second};
    },
    toArray: function (buckets) {
      // if buckets undefiend or an array
      if (!buckets || angular.isArray(buckets)) {
        return buckets;
      }
      var bucketArray = [];
      // if buckets is an object (when it is a group - symptomsGroup, diagnosesGroup)
      angular.forEach(buckets, function (val, key) {
        val.key = key;
        bucketArray.push(val);
      });
      return bucketArray;
    },
    /**
     * For a given record, returns group(s)
     */
    getGroup: getGroup
  };
});
