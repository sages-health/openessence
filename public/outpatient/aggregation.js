'use strict';

var angular = require('angular');
var services = require('../scripts/modules').services;

angular.module(services.name).factory('outpatientAggregation', /*@ngInject*/ function (gettextCatalog, possibleFilters) {

  var aggs = [];
  angular.forEach(possibleFilters.possibleFilters, function (value, key) {
    if(value.aggregation) {
      aggs.push({value: value.filterID, label: value.name});
    }
  });

  return {
    getAggregables: function () {
      return angular.copy(aggs);
    },
    getAggregation: function (name, limit) {
      var copy = angular.copy(possibleFilters.possibleFilters[name].aggregation);
      if (limit && copy.terms) {
        copy.terms.size = limit;
      }
      return copy;
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
