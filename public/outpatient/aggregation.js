'use strict';

var angular = require('angular');
var services = require('../scripts/modules').services;

angular.module(services.name).factory('outpatientAggregation', function (gettextCatalog) {
  var aggregations = {
    sex: {
      terms: {
        field: 'patient.sex',
        order: { '_term': 'asc' }
      }
    },
    symptoms: {
      terms: {
        field: 'symptoms',
        order: { '_term': 'asc' }
      }
    },
    age: {
      range: { // age is actually an age group, b/c that's almost always what you actually want
        field: 'patient.age',
        ranges: [
          {key: '0 to 1', to: 1},
          {key: '1 to 5', from: 1, to: 5},
          {key: '5 to 12', from: 5, to: 12},
          {key: '12 to 18', from: 12, to: 18},
          {key: '18 to 45', from: 18, to: 45},
          {key: '45 to 65', from: 45, to: 65},
          {key: '65+', from: 65}
        ]
      }
    }
  };

  return {
    getAggregation: function (name, limit) {
      var copy = angular.copy(aggregations[name]);
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
    }
  };
});
