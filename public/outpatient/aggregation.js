'use strict';

var angular = require('angular');
var services = require('../scripts/modules').services;

angular.module(services.name).factory('outpatientAggregation', /*@ngInject*/ function (gettextCatalog, possibleFilters) {

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

  // Maps a value to a group
  // Note: if there are multiple groups having this value, it will return first group that has it
  var valueToGroup = function (val, possibleValues) {
    if (val) {
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
    if (val) {
      var i = 0;
      for (i = 0; i < possibleValues.length; i++) {
        if (val >= possibleValues[i].from && val < possibleValues[i].to) {
          return possibleValues[i].name;
        }
      }
    }
    return null;
  };

  return {
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
    getGroup: function (record, field) {
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
          return res;
        }
        // medicalFacility
        else if (angular.isObject(value) && value.name) {
          res = valueToGroup(value.name, field.values);
        } else if (!angular.isUndefined(value)) {
          res = valueToGroup(value, field.values);
        }
      }
      return res;
    }
  };
});
