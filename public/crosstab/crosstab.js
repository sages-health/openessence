/**
 * Wraps pivot.js in a directive, i.e. Angularizes https://github.com/nicolaskruchten/pivottable.
 */

'use strict';

var angular = require('angular');
var directives = require('../scripts/modules').directives;
require('./pivot');

angular.module(directives.name).directive('crosstab', function ($parse) {
  return {
    restrict: 'E',
    compile: function (element, attrs) {
      var recordsExp = $parse(attrs.records);
      var optionsExp = $parse(attrs.options);

      return function link (scope, element) {
        scope.records = recordsExp(scope);
        scope.options = optionsExp(scope);

        var pivot = function (records, options) {
          angular.element(element).pivot(records, options);
        };

        scope.$watch(recordsExp, function (newValue) {
          pivot(newValue, scope.options);
        }); // records array is always replaced by reference

        scope.$watchCollection('[' + attrs.options + '.rows, ' + attrs.options + '.cols]', function (newValue) {
          var options = angular.extend({}, scope.options, {
            rows: newValue[0] || [],
            cols: newValue[1] || []
          });

          pivot(scope.records, options);
        });
      };
    }
  };
});
