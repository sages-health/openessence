'use strict';

var angular = require('angular');
var services = require('../scripts/modules').services;

angular.module(services.name).factory('outpatientAggregation', /*@ngInject*/ function (gettextCatalog) {

  var aggregables = {  //backend will wrap with "aggs : {"
    'patient.sex': {
      label: gettextCatalog.getString('Sex'),
      aggregation: {
        terms: {
          field: 'patient.sex',
          order: { '_term': 'asc' }
        }
      }
    },
    'symptoms': {
      label: gettextCatalog.getString('Symptoms'),
      aggregation: {
        nested: {
          path: 'symptoms'
        },
        aggs: {
          _name: { //double check that using an underscore is kosher
            terms: {
              field: 'symptoms.name.raw',
              order: { '_term': 'asc' }
            },
            aggs: {
              count: {
                sum: {
                  field: 'symptoms.count'
                }
              }
            }
          }
        }
      }
    },
    'diagnoses': {
      label: gettextCatalog.getString('Diagnoses'),
      aggregation: {
        nested: {
          path: 'diagnoses'
        },
        aggs: {
          _name: { //double check that using an underscore is kosher
            terms: {
              field: 'diagnoses.name.raw',
              order: { '_term': 'asc' }
            },
            aggs: {
              count: {
                sum: {
                  field: 'diagnoses.count'
                }
              }
            }
          }
        }
      }
    },
    'medicalFacility.name': {
      label: gettextCatalog.getString('Facility'),
      aggregation: {
        terms: {
          field: 'medicalFacility.name.raw',
          order: { '_term': 'asc' }
        }
      }
    },
    'medicalFacility.location.district': {
      label: gettextCatalog.getString('District'),
      aggregation: {
        terms: {
          field: 'medicalFacility.location.district.raw',
          order: { '_term': 'asc' }
        }
      }
    },
    'patient.age': {
      label: gettextCatalog.getString('Age'),
      aggregation: {
        range: { // age is actually an age group, b/c that's almost always what you actually want
          field: 'patient.age.years',
          ranges: [
            {key: '[0 TO 1}', to: 1},
            {key: '[1 TO 5}', from: 1, to: 5},
            {key: '[5 TO 12}', from: 5, to: 12},
            {key: '[12 TO 18}', from: 12, to: 18},
            {key: '[18 TO 45}', from: 18, to: 45},
            {key: '[45 TO 65}', from: 45, to: 65},
            {key: '[65 TO *]', from: 65}
          ]
        }
      }
    }
  };
  var pivotArray = [];
  for (var agg in aggregables) {
    pivotArray.push({value: agg, label: aggregables[agg].label});
  }

  return {
    getAggregables: function () {
      return angular.copy(pivotArray);
    },
    getAggregation: function (name, limit) {
      var copy = angular.copy(aggregables[name].aggregation);
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
