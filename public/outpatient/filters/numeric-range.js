'use strict';

var angular = require('angular');
var directives = require('../../scripts/modules').directives;

angular.module(directives.name).directive('outpatientNumericRangeFilter', function () {
  return {
    restrict: 'E',
    template: require('./numeric-range.html'),
    transclude: true,
    scope: {
      filter: '=fracasFilter',
      close: '&onClose'
    },
    link: {
      pre: function (scope) {

        scope.filter.value = scope.filter.value || '';

        scope.$watch('filter.value', function (value) {
          value = value || '*';
          scope.filter.queryString = scope.filter.field + ': ' + value;
        });
      }
    }
  };
});
