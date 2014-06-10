'use strict';

var angular = require('angular');
var directives = require('../../scripts/modules').directives;

angular.module(directives.name).directive('outpatientCheckBoxFilter', function () {
  return {
    restrict: 'E',
    template: require('./check-box.html'),
    transclude: true,
    scope: {
      filter: '=fracasFilter',
      close: '&onClose'
    },
    link: {
      pre: function (scope) {

        scope.filter.value = scope.filter.value || false;

        scope.$watch('filter.value', function (value) {
          value = value || false;
          scope.filter.queryString = scope.filter.field + ':' + value;
        });
      }
    }
  };
});
