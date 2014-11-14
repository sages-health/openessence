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
      var pivotExp = $parse(attrs.pivot);

      return function link (scope, element) {
        scope.records = recordsExp(scope);
        scope.pivot = pivotExp(scope);

        var pivotFn = function (records, pivot) {
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
                    var col = scope.pivot.cols[0];
                    var row = scope.pivot.rows[0];

                    if (record[col]) {
                      if (typeof record[col] !== 'string') {
                        if (record[col][0] && record[col][0][countKey] !== undefined) {
                          this.count += record[col][0][countKey];
                          return;
                        }
                      }
                      this.count++;
                    } else if (record[row]) {
                      if (typeof record[row] !== 'string') {
                        if (record[row][0] && record[row][0][countKey] !== undefined) {
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
            scope.pivot,
            pivot
          );
          angular.element(element).pivot(records, opts);
        };

        scope.$watch(recordsExp, function (newValue) {
          pivotFn(newValue, scope.pivot);
        }); // records array is always replaced by reference

        scope.$watchCollection('[' + attrs.pivot + '.rows, ' + attrs.pivot + '.cols]', function (newValue) {
          var pivot = angular.extend(
            scope.pivot,
            {
              rows: newValue[0] || [],
              cols: newValue[1] || []
            });
          pivotFn(scope.records, pivot);
        });
      };
    }
  };
});
