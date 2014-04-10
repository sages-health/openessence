/**
 * Hinge - AKA the "magic pivot thing" that controls visualizations.
 */

'use strict';

var angular = require('angular');
var directives = require('../scripts/modules').directives;
require('../select2');
require('../jquery-ui');

angular.module(directives.name).directive('hinge', function (gettextCatalog) {
  return {
    restrict: 'E',
    transclude: true,
    template: require('./hinge.html'),
    scope: {
      visualization: '=', // what visualization we're working with
      pivot: '=', // what rows/columns we're currently pivoting on
      options: '=', // available options to pivot on
      close: '&onClose'
    },
    link: {
      pre: function (scope) {
        // TODO think of visualization-independent name, e.g. 'Grouping', but better, or change placeholder depending
        // on the selected visualization
        scope.pivotRowsPlaceholder = gettextCatalog.getString('Pivot rows');
        scope.pivotColsPlaceholder = gettextCatalog.getString('Pivot columns');

        scope.select2Options = {
          sortable: true,
          'simple_tags': true,
          data: scope.options.map(function (o) {
            return {
              id: o.value,
              text: o.label
            };
          })
        };
      },
      post: function (scope, element) {
        var updateViz = function (rows, cols) {
          if (rows.length === 0 && cols.length === 0) {
            // crosstab doesn't make sense with no pivots (unless they wanted to see aggregations...)
            scope.visualization.name = 'table';
          } else {
            if (scope.visualization.name === 'table') {
              // table doesn't make sense so switch to crosstab
              scope.visualization.name = 'crosstab';
            }
          }
        };

        var sort = function (element) {
          // needed until https://github.com/angular-ui/ui-select2/pull/181 is merged upstream
          element.select2('container')
            .find('ul.select2-choices')
            .sortable({
              containment: 'parent',
              start: function () {
                element.select2('onSortStart');
              },
              update: function () {
                element.select2('onSortEnd');
                element.trigger('change');
              }
            });
        };

        scope.$watchCollection('pivot.rows', function (rows) {
          updateViz(rows, scope.pivot.cols);
          sort(element.find('.pivot-rows'));
        });

        scope.$watchCollection('pivot.cols', function (cols) {
          updateViz(scope.pivot.rows, cols);
          sort(element.find('.pivot-cols'));
        });
      }
    }
  };
});
