'use strict';

var angular = require('angular');
var directives = require('../scripts/modules').directives;

angular.module(directives.name).directive('workbenchVisualization', function () {
  return {
    template: '<hinge visualization="visualization" pivot="pivot" options="pivotOptions" on-close="close()">' +
      '<outpatient-visualization visualization="visualization" pivot="pivot" query-string="queryString" filters="filters"></outpatient-visualization></hinge>',
    restrict: 'E',
    scope: {
      visualization: '=?',
      pivot: '=?',
      pivotOptions: '=',
      close: '&onClose',
      queryString: '=',
      filters: '='
    },
    compile: function () {
      return {
        pre: function (scope) {
          scope.visualization = scope.visualization || {
            name: 'table'
          };

          scope.pivot = scope.pivot || {
            rows: [],
            cols: []
          };
        }
      };
    }
  };
});
