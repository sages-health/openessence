'use strict';

var angular = require('angular');
var directives = require('../../scripts/modules').directives;

angular.module(directives.name).directive('outpatientNameFilter', function (gettextCatalog) {
  return {
    restrict: 'E',
    template: require('./name.html'),
    transclude: true,
    scope: {
      filter: '=fracasFilter',
      close: '&onClose'
    },
    link: {
      pre: function (scope) {
        scope.strings = {
          name: gettextCatalog.getString('Name')
        };

        scope.filter.value = '';

        scope.$watch('filter.value', function (name) {
          name = name || '*';
          scope.filter.queryString = 'name:' + name;
        });
      }
    }
  };
});
