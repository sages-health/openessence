/**
 * Hinge - AKA the "magic pivot thing" that controls visualizations.
 */

'use strict';

var angular = require('angular');
var directives = require('../scripts/modules').directives;
require('../select2');

angular.module(directives.name).directive('hinge', /*@ngInject*/ function (gettextCatalog) {
  return {
    restrict: 'E',
    transclude: true,
    template: require('./hinge.html'),
    scope: {
      visualization: '=?', // what visualization we're working with
      pivot: '=?', // what rows/columns we're currently pivoting on
      close: '&onClose',
      pivotOptions: '=?'
    },
    link: {
      pre: function (scope) {
        scope.visualization = scope.visualization || {
          name: 'table'
        };
        scope.pivotOptions = scope.pivotOptions || [];

        scope.pivot = scope.pivot || {
          rows: [],
          cols: []
        };

        // TODO think of visualization-independent name, e.g. 'Grouping', but better, or change placeholder depending
        // on the selected visualization
        scope.pivotRowsPlaceholder = gettextCatalog.getString('Report Rows');
        scope.pivotColsPlaceholder = gettextCatalog.getString('Attribute Columns');

        scope.select2Options = {
          sortable: true,
          'simple_tags': true,
          data: scope.pivotOptions.map(function (o) {
            return {
              id: o.value,
              text: o.label
            };
          })
        };

        scope.settings = function () {
          // broadcast on parent since transcluded scope is our sibling
          scope.$parent.$broadcast('editVisualizationSettings');
        };

        scope.exportViz = function () {
          // broadcast on parent since transcluded scope is our sibling
          scope.$parent.$broadcast('exportVisualization');
        };

        scope.saveViz = function () {
          // broadcast on parent since transcluded scope is our sibling
          scope.$parent.$broadcast('saveVisualization');
        };
      },
      post: function (scope, element) {
        var updateViz = function (rows, cols) {
          if (rows.length === 0 && cols.length === 0 && scope.visualization.name === 'crosstab') {
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

        scope.$watchCollection('visualization.name', function () {
          scope.$parent.$broadcast('visualizationNameChanged');
        });

      }
    }
  };
});
