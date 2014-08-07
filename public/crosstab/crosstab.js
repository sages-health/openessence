/**
 * Wraps pivot.js in a directive, i.e. Angularizes https://github.com/nicolaskruchten/pivottable.
 */

'use strict';

var angular = require('angular');
var directives = require('../scripts/modules').directives;
var $ = require('jquery');
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
          var countKey = 'count';
          var options = angular.extend(
            {
              // heatmaps are nice in theory but make it harder to read and the bar chart is kind of pointless
              renderer: $.pivotUtilities.renderers.Table,
              aggregator: function () {
                return {
                  count: 0,
                  push: function (record) {
                    //if there is a count column use it for the summation
                    if (record[countKey]) {
                      if (!isNaN(parseFloat(record[countKey]))) {
                        this.count += record[countKey].count;
                      }
                    } else {
                      this.count++;
                    }
                  },
                  value: function () {
                    return this.count;
                  },
                  format: function (x) {
                    return x;
                  },
                  label: 'SumCount'
                };
              }
            },
            scope.options,
            {
              rows: newValue[0] || [],
              cols: newValue[1] || []
            });

          pivot(scope.records, options);
        });
      };
    }
  };
});
