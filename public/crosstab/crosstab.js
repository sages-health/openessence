/**
 * Wraps pivot.js in a directive, i.e. Angularizes https://github.com/nicolaskruchten/pivottable.
 */

'use strict';

var angular = require('angular');
var directives = require('../scripts/modules').directives;
var $ = require('jquery');
require('./pivot');

angular.module(directives.name).directive('crosstab', /*@ngInject*/ function () {
  return {
    restrict: 'E',
    scope: {
      options: '=',
      width: '=?',
      height: '=?',
      pivot: '=',
      records: '='
    },
    link: function (scope, element) {
      scope.records = scope.records || {};
      scope.pivot = scope.pivot || {};

      var pivotFn = function (records, pivot) {
        scope.options.width = scope.options.width || scope.width || 500;
        scope.options.height = scope.options.height || scope.height || 400;

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

      scope.$watch('records', function (newValue) {
        pivotFn(newValue, scope.pivot);
      }); // records array is always replaced by reference

      scope.$watchCollection('[pivot.rows, pivot.cols]', function (newValue) {
        var pivot = angular.extend(
          scope.pivot,
          {
            rows: newValue[0] || [],
            cols: newValue[1] || []
          });
        pivotFn(scope.records, pivot);
      });

      scope.$watchCollection('[options.width, options.height]', function (newValue) {
        //console.log('width: %s, height: %s', newValue[0], newValue[1]);
        angular.element(element)[0].parentElement.style.height = newValue[1] + 'px';
      });
    }
  };
});
