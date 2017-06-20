/**
 * Hinge - AKA the "magic pivot thing" that controls visualizations.
 */

'use strict';

var angular = require('angular');
var directives = require('../scripts/modules').directives;

angular.module(directives.name).directive('hinge', /*@ngInject*/ function ($filter) {
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

        scope.pivotSelect = scope.pivotSelect || {
            rows: [],
            cols: []
        }

        // TODO think of visualization-independent name, e.g. 'Grouping', but better, or change placeholder depending
        // on the selected visualization
        scope.pivotRowsPlaceholder = 'hinge.Stratify';
        scope.pivotColsPlaceholder = 'hinge.Stratify';

        scope.select2Options = {
          sortable: true,
          'simple_tags': true,
          data: scope.pivotOptions.map(function (o) {
            return {
                id: o.value,
                text: $filter('i18next')(o.label)
            };
          }).sort(function(a, b){
            if (a.text > b.text) {
              return 1;
            }
            if (a.text < b.text) {
              return -1;
            }
            // a must be equal to b
            return 0;
          })
        };

        scope.settings = function () {
          // broadcast on parent since transcluded scope is our sibling
          scope.$parent.$broadcast('editVisualizationSettings');
        };

        scope.exportViz = function () {
          // broadcast on parent since transcluded scope is our sibling
          scope.$parent.$broadcast('exportPNGImage');
          scope.$parent.$broadcast('exportVisualization');
        };

        scope.saveViz = function () {
          // broadcast on parent since transcluded scope is our sibling
          scope.$parent.$broadcast('saveVisualization');
        };

        scope.exportPNG = function () {
          scope.$parent.$broadcast('exportPNG');
        };

        scope.exportJPEG = function () {
          scope.$parent.$broadcast('exportJPEG');
        };

        scope.exportPDF = function () {
          scope.$parent.$broadcast('exportPDF');
        };

        scope.printChart = function () {
          scope.$parent.$broadcast('printChart');
        };

        scope.onRowChanged = function () {
            if (scope.pivotSelect.rows !== null)
                scope.pivot.rows = Array(scope.pivotSelect.rows.id);
            else
                scope.pivot.rows = [];
        };

        scope.onColChanged = function () {
            if (scope.pivotSelect.cols !== null)
                scope.pivot.cols = Array(scope.pivotSelect.cols.id);
            else
                scope.pivot.cols = [];
        };

      },
      post: function (scope, element) {
        var updateViz = function (rows, cols) {
          if (scope.visualization.name === 'table' && (rows.length !== 0 || cols.length !== 0)) {
            // table doesn't make sense so switch to crosstab
            scope.visualization.name = 'crosstab';
          }
        };

        scope.$watchCollection('pivot.rows', function (rows) {
          updateViz(rows, scope.pivot.cols);
        });

        scope.$watchCollection('pivot.cols', function (cols) {
          updateViz(scope.pivot.rows, cols);
        });

        scope.$watchCollection('visualization.name', function () {
          scope.$parent.$broadcast('visualizationNameChanged');
        });

      }
    }
  };
});
