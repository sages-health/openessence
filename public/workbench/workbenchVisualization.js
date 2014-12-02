'use strict';

var angular = require('angular');
var directives = require('../scripts/modules').directives;

angular.module(directives.name).directive('workbenchVisualization', /*@ngInject*/ function ($timeout) {
  return {
    template: '<hinge visualization="visualization" pivot="pivot" pivot-options="pivotOptions" on-close="close()" on-settings="settings()">' +
      '<outpatient-visualization visualization="visualization" pivot="pivot" query-string="queryString" ' +
      'filters="filters" options="options"></outpatient-visualization></hinge>',
    restrict: 'E',
    scope: {
      visualization: '=?',
      pivot: '=?',
      pivotOptions: '=',
      close: '&onClose',
      settings: '&onSettings',
      queryString: '=',
      filters: '='
    },
    compile: function () {
      return {
        pre: function (scope, element) {
          scope.options = scope.options || {};
          scope.pivotOptions = scope.pivotOptions || [];

          var parent,
            header,
            footer;
          var lis = angular.element('li.workbench-visualization');
          angular.forEach(lis, function (value) {
            if (value.contains(element[0])) {
              parent = angular.element(value);
              header = parent.find('.panel-heading');
              footer = parent.find('.panel-footer');
            }
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

              scope.options = scope.options || {};
              scope.options.height = scope.height = height - (header[0].offsetHeight + footer[0].offsetHeight) - 5;
              scope.options.width = scope.width = width;

              // adjust margins on a per chart basis
              if (scope.visualization.name === 'line') {
                scope.options.height = scope.height -= 75;
                scope.options.width = scope.width -= 50;
              }
            }, 25);
          });
        }
      };
    }
  };
});
