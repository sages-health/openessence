'use strict';

var angular = require('angular');
var directives = require('../../scripts/modules').directives;

angular.module(directives.name).directive('outpatientSymptomsFilter', function (gettextCatalog) {
  return {
    restrict: 'E',
    template: require('./symptom.html'),
    transclude: true,
    scope: {
      filter: '=fracasFilter',
      close: '&onClose'
    },
    link: {
      pre: function (scope) {
        scope.strings = {
          name: gettextCatalog.getString('Symptoms')
        };

        scope.filter.value = scope.filter.value || '*';

        scope.$watch('filter.value', function (symptom) {
          symptom = symptom || '*';
          scope.filter.queryString = 'symptoms:' + symptom;
        });
      }
    }
  };
});
