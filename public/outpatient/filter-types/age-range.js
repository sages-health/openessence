'use strict';

var angular = require('angular');
var directives = require('../../scripts/modules').directives;

angular.module(directives.name).directive('outpatientAgeRangeFilter', /*@ngInject*/ function ($filter) {
  return {
    restrict: 'E',
    template: require('./age-range.html'),
    scope: {
      filter: '=fracasFilter',
      close: '&onClose'
    },
    link: {
      pre: function (scope) {
        scope.strings = {
          any: $filter('i18next')('app.Any')
        };
        scope.filter.value = scope.filter.value || '*';
        if (scope.filter.values) {
          scope.filter.values = scope.filter.values.map(function (v) {
            return {
              // NOTE: this will not mark the string for extraction
              name: v.name,
              value: v.name
            };
          });
        }

        // If filter's value isn't in list of possible values, add it. Otherwise, it looks like nothing is selected
        if (scope.filter.values && scope.filter.value !== '*') {
          // if data value is string, make an array
          if (typeof(scope.filter.value) === 'string') {
            scope.filter.value = [scope.filter.value];
          }
          // Add val to values if it does not exist
          scope.filter.value.forEach(function (val) {
            if (!scope.filter.values.find(function (v) {
              return v.value === val;
            })) {
              scope.filter.values.push({
                name: val,
                value: val
              });
            }
          });
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
      }
    }
  };
});
