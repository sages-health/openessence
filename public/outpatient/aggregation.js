'use strict';

var angular = require('angular');
var services = require('../scripts/modules').services;

angular.module(services.name).factory('outpatientAggregation', function () {
  var aggregations = {
    sex: {
      terms: {
        field: 'patient.sex'
      }
    },
    age: {
      range: { // age is actually an age group, b/c that's almost always what you actually want
        field: 'patient.age',
        ranges: [
          {to: 1},
          {from: 1, to: 5},
          {from: 5, to: 12},
          {from: 12, to: 18},
          {from: 18, to: 45},
          {from: 45, to: 65},
          {from: 65}
        ]
      }
    }
  };

  return {
    getAggregation: function (name) {
      return angular.copy(aggregations[name]);
    },

    /**
     * Given a bucket from elasticsearch aggregation response, return a key to identify said bucket
     * @param bucket elasticsearch bucket
     */
    bucketToKey: function (bucket) {
      if (bucket.key) {
        return bucket.key;
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
