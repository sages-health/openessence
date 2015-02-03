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
     * Given a bucket from elasticsearch aggregation response, return a key to identify said bucket
     * @param bucket elasticsearch bucket
     */
    bucketToKey: function (bucket) {
      if (bucket.key) {
        return gettextCatalog.getString(bucket.key);
      }

      if (bucket.from && bucket.to) {
        return bucket.from + '-' + bucket.to;
      } else if (bucket.from) {
        return '>' + bucket.from;
      } else if (bucket.to) {
        return '<' + bucket.to;
      } else {
        throw new Error('Cannot make key for bucket ' + bucket);
      }
    },
    getAgeGroup: function (age) {
      //TODO make this use the aggregation json "getAggregation('patient.age').. to limit potential inconsistencies.
      if (age !== undefined) {
        if (age < 1) {
          return '[0 TO 1}';
        } else if (age < 5) {
          return '[1 TO 5}';
        } else if (age < 12) {
          return '[5 TO 12}';
        } else if (age < 18) {
          return '[12 TO 18}';
        } else if (age < 45) {
          return '[18 TO 45}';
        } else if (age < 65) {
          return '[45 TO 65}';
        } else {
          return '[65 TO *]';
        }
      }
      return '';
    }
  };
});
