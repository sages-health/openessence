'use strict';

var angular = require('angular');
var directives = require('../scripts/modules').directives;

angular.module(directives.name).directive('dashboardWidget', /*@ngInject*/ function ($timeout, updateURL) {
  return {
    restrict: 'E',
    template: '<outpatient-visualization options="options" height="height" width="width" filters="options.filters" query-string="options.queryString" source="source" widget="widget"></outpatient-visualization>',
    scope: {
      options: '=',
      sizeX: '=',
      sizeY: '=',
      row: '=',
      col: '=',
      source: '=?',
      widget: '=?'
    },
    compile: function () {
      return {
        pre: function (scope, element) {

          var parent;
          var lis = angular.element('li.dashboard-widget');
          angular.forEach(lis, function (value) {
            if (value.contains(element[0])) {
              parent = angular.element(value);
            }
          });

          scope.$watchCollection('[sizeX, sizeY, row, col]', function () {
            updateURL.updateVisualization(scope.options.id, {
              sizeX: scope.sizeX,
              sizeY: scope.sizeY,
              row: scope.row,
              col: scope.col
            });
          });

          scope.$watchCollection(function () {
            return '[' + parent.width() + ', ' + parent.height() + ']';
          }, function () {
            // Use a timer to prevent a gazillion chart redraws
            if (scope.timeId) {
              $timeout.cancel(scope.timeId);
              scope.timeId = null;
            }
            scope.timeId = $timeout(function () {
              var height = parent.height();
              var width = parent.width();
              scope.options.height = scope.height = height - 50;
              scope.options.width = scope.width = width - 50;

              // adjust margins on a per chart basis
              if (scope.options.visualization.name === 'line') {
                scope.options.height = scope.height -= 30;
              }
            }, 25);
          });
        }
      };
    }
  };
});
