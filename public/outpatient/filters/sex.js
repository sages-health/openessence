'use strict';

var angular = require('angular');
var directives = require('../../scripts/modules').directives;

angular.module(directives.name).directive('outpatientSexFilter', function (gettextCatalog) {
  return {
    restrict: 'E',
    template: require('./sex.html'),
    transclude: true,
    scope: {
      filter: '=fracasFilter',
      close: '&onClose'
    },
    link: {
      pre: function (scope) {
        scope.strings = {
          name: gettextCatalog.getString('Sex')
        };

        scope.model = {
          sex: '*'
        };
        scope.$watch('model.sex', function (sex) {
          sex = sex || '*';
          scope.filter.queryString = 'patient.sex:' + sex;
        });
      }
    }
  };
});
