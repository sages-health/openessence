/**
 * Hinge - AKA the "magic pivot thing" that controls visualizations.
 */

'use strict';

var angular = require('angular');
var directives = require('../scripts/modules').directives;

angular.module(directives.name).directive('hinge', function () {
  return {
    restrict: 'E',
    transclude: true,
    template: require('./hinge.html'),
    scope: {
      visualization: '=', // what visualization we're working with
      pivot: '=', // what rows/columns we're currently pivoting on
      options: '=' // available options to pivot on
    },
    controller: ['$scope', 'gettextCatalog', function ($scope, gettextCatalog) {
      // TODO think of visualization-independent name, e.g. 'Grouping', but better, or change placeholder depending
      // on the selected visualization
      $scope.pivotRowsPlaceholder = gettextCatalog.getString('Pivot rows');
      $scope.pivotColsPlaceholder = gettextCatalog.getString('Pivot columns');

      $scope.$watchCollection('[pivot.rows, pivot.cols]', function (newValue) {
        var rows = newValue[0] || [];
        var cols = newValue[1] || [];

        if (rows.length === 0 && cols.length === 0) {
          // crosstab doesn't make sense with no pivots (unless they wanted to see aggregations...)
          $scope.visualization.name = 'table';
        } else {
          if ($scope.visualization.name === 'table') {
            // table doesn't make sense so switch to crosstab
            $scope.visualization.name = 'crosstab';
          }
        }
      });
    }]
  };
});
