'use strict';

var angular = require('angular');
var directives = require('../../scripts/modules').directives;

angular.module(directives.name).directive('outpatientSymptomsFilter', function (gettextCatalog, Symptom) {
  return {
    restrict: 'E',
    template: require('./symptom.html'),
    scope: {
      filter: '=fracasFilter',
      close: '&onClose'
    },
    link: {
      pre: function (scope) {
        scope.strings = {
          name: gettextCatalog.getString('Symptoms'),
          any: gettextCatalog.getString('Any symptom')
        };
        scope.filter.value = scope.filter.value || '*';
        var searchParams = {
          size: 100, // TODO search on demand if response indicates there are more records
          sort: 'name'
        };
        Symptom.get(searchParams, function (response) {
          scope.symptoms = response.results.map(function (r) {
            return r._source.name;
          });
          if (scope.filter.value !== '*') {
            var index = scope.symptoms.indexOf(scope.filter.value);
            if (index < 0) {
              scope.symptoms.push(scope.filter.value);
            }
          }
          scope.$watch('filter.value', function (symptom) {
            if (Array.isArray(symptom)) {
              if (symptom.length > 1) {
                symptom = '("' + symptom.join('" OR "') + '")';
              } else if (symptom.length === 1 && symptom[0] !== '*') {
                symptom = symptom[0] ? ('"' + symptom[0] + '"') : '*';
              } else {
                // empty array
                symptom = '*';
              }
            } else if (symptom !== '*') {
              symptom = symptom ? ('"' + symptom + '"') : '*';
            }
            scope.filter.queryString = 'symptoms:' + symptom;
          });
        });
      }
    }
  };
});
