'use strict';

var angular = require('angular');
var directives = require('../scripts/modules').directives;

angular.module(directives.name).directive('workbenchVisualization', function () {
  return {
    template: '<hinge visualization="visualization" pivot="pivot" options="pivotOptions" on-close="close()">' +
      '<outpatient-visualization visualization="visualization" pivot="pivot" query-string="queryString" filters="filters" options="options"></outpatient-visualization></hinge>',
    restrict: 'E',
    scope: {
      visualization: '=?',
      pivot: '=?',
      pivotOptions: '=',
      close: '&onClose',
      queryString: '=',
      filters: '=',
      vizGrid: '='
    },
    compile: function () {
      return {
        pre: function (scope, element) {
          scope.visualization = scope.visualization || {
            name: 'table'
          };

          scope.pivot = scope.pivot || {
            rows: [],
            cols: []
          };
          scope.options = {
            width: element.width()
          };
          scope.$watch('vizGrid.indexOfPlus()', function () {
            scope.options = scope.options || {};
            scope.options.width = element.width();
            scope.options.height = 500;
          });
        }
      };
    }
  };
});
