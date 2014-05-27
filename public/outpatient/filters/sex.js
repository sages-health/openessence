'use strict';

var angular = require('angular');
var directives = require('../../scripts/modules').directives;

angular.module(directives.name).directive('outpatientSexFilter', function (gettextCatalog) {
  return {
    restrict: 'E',
    template: require('./sex.html'),
    scope: {
      filter: '=fracasFilter',
      close: '&onClose'
    },
    link: {
      pre: function (scope) {
        scope.strings = {
          name: gettextCatalog.getString('Sex'),
          any: gettextCatalog.getString('Any sex')
        };

        scope.filter.value = scope.filter.value || '*';

        scope.$watch('filter.value', function (sex) {
          if (!sex || (Array.isArray(sex) && sex.length === 0)) {
            sex = '*';
          } else if (Array.isArray(sex) && sex.length > 0) {
            sex = '(' + sex.join(' OR ') + ')';
          }

          scope.filter.queryString = 'patient.sex:' + sex;
        });
      }
    }
  };
});
