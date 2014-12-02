/**
 * Wraps pivot.js in a directive, i.e. Angularizes https://github.com/nicolaskruchten/pivottable.
 */

'use strict';

var angular = require('angular');
var directives = require('../scripts/modules').directives;
var $ = require('jquery');
require('./pivot');

angular.module(directives.name).directive('crosstab', /*@ngInject*/ function ($parse) {
  return {
    restrict: 'E',
    compile: function (element, attrs) {
      var recordsExp = $parse(attrs.records);
      var optionsExp = $parse(attrs.options);

      return function link (scope, element) {
        scope.records = recordsExp(scope);
        scope.options = optionsExp(scope);

        var pivot = function (records, options) {
          var countKey = 'count';
          var opts = angular.extend(
            {
              // heatmaps are nice in theory but make it harder to read and the bar chart is kind of pointless
              renderer: $.pivotUtilities.renderers.Table,
              aggregator: function (data, rowKey, colKey) {

                return {
                  colk: colKey,
                  rowk: rowKey,
                  countStore: {},
                  count: 0,
                  push: function (record) {
                    var col = scope.options.cols[0];
                    var row = scope.options.rows[0];

                    if (record[col]) {
                      if (typeof record[col] !== 'string') {
                        if (record[col][0] && record[col][0][countKey]) {
                          this.count += record[col][0][countKey];
                          return;
                        }
                      }
                      this.count++;
                    } else if (record[row]) {
                      if (typeof record[row] !== 'string') {
                        if (record[row][0] && record[row][0][countKey]) {
                          this.count += record[row][0][countKey];
                          return;
                        }
                      }
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
            options
          );
          angular.element(element).pivot(records, opts);
        };

        scope.$watch(recordsExp, function (newValue) {
          pivot(newValue, scope.options);
        }); // records array is always replaced by reference

        scope.$watchCollection('[' + attrs.options + '.rows, ' + attrs.options + '.cols]', function (newValue) {
          var options = angular.extend(
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
