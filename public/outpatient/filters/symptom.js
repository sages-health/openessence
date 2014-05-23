'use strict';

var angular = require('angular');
var directives = require('../../scripts/modules').directives;

angular.module(directives.name).directive('outpatientSymptomsFilter', function (gettextCatalog) {
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

        scope.$watch('filter.value', function (symptom) {
          if (!symptom || (Array.isArray(symptom) && symptom.length === 0)) {
            symptom = '*';
          } else if (Array.isArray(symptom) && symptom.length > 0) {
            symptom = '(' + symptom.join(' OR ') + ')';
          }

          symptom = symptom || '*';
          scope.filter.queryString = 'symptoms:' + symptom;
        });
      }
    }
  };
});
