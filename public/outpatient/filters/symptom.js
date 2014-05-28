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
        var searchParams = {
          size: 100, // TODO search on demand if response indicates there are more records
          sort: 'name'
        };
        Symptom.get(searchParams, function (response) {
          scope.symptoms = response.results.map(function (r) {
            return r._source.name;
          });
        });

        scope.strings = {
          name: gettextCatalog.getString('Symptoms'),
          any: gettextCatalog.getString('Any symptom')
        };

        scope.filter.value = scope.filter.value || '*';

        scope.$watch('filter.value', function (symptom) {
          if (!symptom || (Array.isArray(symptom) && symptom.length === 0)) {
            symptom = '*';
          } else if (Array.isArray(symptom) && symptom.length > 0) {
            symptom = '(' + symptom.join(' OR ') + ')';
          }

          symptom = symptom || '*';
          // TODO: If symptom is fever, it will match all records having fever as substring
          // This query should do exact match
          scope.filter.queryString = 'symptoms:' + symptom;
        });
      }
    }
  };
});
