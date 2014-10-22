'use strict';

var angular = require('angular');
var directives = require('../../scripts/modules').directives;

angular.module(directives.name).directive('outpatientTextFilter', /*@ngInject*/ function (gettextCatalog) {
  return {
    restrict: 'E',
    template: require('./text.html'),
    transclude: true,
    scope: {
      filter: '=fracasFilter',
      close: '&onClose'
    },
    link: {
      pre: function (scope) {
        scope.strings = {
          any: gettextCatalog.getString('Any')
        };
        scope.filter.value = scope.filter.value || '';

        scope.$watch('filter.value', function (name) {
          name = name || '*';
          scope.filter.queryString = scope.filter.field + ':' + name;
        });
      }
    }
  };
});
