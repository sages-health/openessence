'use strict';

var angular = require('angular');
var directives = require('../../scripts/modules').directives;

angular.module(directives.name).directive('outpatientMultiSelectFilter', /*@ngInject*/ function (gettextCatalog) {
  return {
    restrict: 'E',
    template: require('./multi-select.html'),
    scope: {
      filter: '=fracasFilter',
      close: '&onClose'
    },
    link: {
      pre: function (scope) {
        scope.strings = {
          any: gettextCatalog.getString('Any')
        };
        scope.filter.value = scope.filter.value || '*';

        var searchParams = {
          size: 100, // TODO search on demand if response indicates there are more records
          sort: (scope.filter.store.sort || scope.filter.store.field)
        };
        scope.filter.store.resource.get(searchParams, function (response) {
          scope.list = response.results.map(function (r) {
            return r._source[scope.filter.store.field];
          });
          if (scope.filter.value !== '*') {
            var index = scope.list.indexOf(scope.filter.value);
            if (index < 0) {
              scope.list.push(scope.filter.value);
            }
          }

          scope.$watch('filter.value', function (selectedValue) {
            if (Array.isArray(selectedValue)) {
              if (selectedValue.length > 1) {
                selectedValue = '("' + selectedValue.join('" OR "') + '")';
              } else if (selectedValue.length === 1 && selectedValue[0] !== '*') {
                selectedValue = selectedValue[0] ? ('"' + selectedValue[0] + '"') : '*';
              } else {
                // empty array
                selectedValue = '*';
              }
            } else if (selectedValue !== '*') {
              selectedValue = selectedValue ? ('"' + selectedValue + '"') : '*';
            }
            scope.filter.queryString = scope.filter.field + ':' + selectedValue;
          });
        });
      }
    }
  };
});
