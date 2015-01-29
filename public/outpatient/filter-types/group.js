'use strict';

var angular = require('angular');
var directives = require('../../scripts/modules').directives;

angular.module(directives.name).directive('outpatientGroupFilter', /*@ngInject*/ function (gettextCatalog) {
  return {
    restrict: 'E',
    template: require('./group.html'),
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

        if (scope.filter.values) {
          scope.filter.values = scope.filter.values.map(function (v) {
            var value = v.value;
            if (typeof(v.value) !== 'string') {
              value = v.value.map(function (val) {
                return '"' + val + '"';
              }).join(' OR ');
            }
            return {
              // NOTE: this will not mark the string for extraction
              name: gettextCatalog.getString(v.name),
              value: value
            };
          });
        }

        // returns id  for given displayvalue/name
        var nameToValue = function (name) {
          var res;
          angular.forEach(scope.filter.values, function (v) {
            if (v.name === name) {
              res = v.value;
            }
          });
          return res;
        };

        // we need to translate name=>value when filter is added by click through on a pie/bar chart
        if (scope.filter.filterEvent && scope.filter.value && scope.filter.value !== '*') {
          // TODO: handle scope.filter.value="missing" (when user clicks on "missing" slice on pie chart)
          scope.filter.value = nameToValue(scope.filter.value);
          delete scope.filter.filterEvent;
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
                name: gettextCatalog.getString(val),
                value: val
              });
            }
          });
        }

        scope.$watch('filter.value', function (selectedValue) {
          if (Array.isArray(selectedValue)) {
            if (selectedValue.length > 1) {
              selectedValue = '(' + selectedValue.join(' OR ') + ')';
            } else if (selectedValue.length === 1 && selectedValue[0] !== '*') {
              selectedValue = selectedValue[0] ? '(' + selectedValue[0] + ')' : '*';
            } else {
              // empty array
              selectedValue = '*';
            }
          } else if (selectedValue !== '*') {
            selectedValue = selectedValue ? selectedValue : '*';
          }
          scope.filter.queryString = scope.filter.field + ':' + selectedValue;
        });
      }
    }
  };
});
