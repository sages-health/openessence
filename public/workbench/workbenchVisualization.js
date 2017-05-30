'use strict';

var angular = require('angular');
var directives = require('../scripts/modules').directives;

angular.module(directives.name).directive('workbenchVisualization', /*@ngInject*/ function ($timeout, updateURL) {
  return {
    template: '<hinge visualization="visualization" pivot="pivot" pivot-options="pivotOptions" on-close="close()" on-settings="settings()">' +
    '<outpatient-visualization visualization="visualization" pivot="pivot" query-string="queryString" ' +
    'filters="filters" form="form" options="options" source="source"></outpatient-visualization></hinge>',
    restrict: 'E',
    scope: {
      visualization: '=?',
      options: '=?',
      pivot: '=?',
      pivotOptions: '=',
      close: '&onClose',
      settings: '&onSettings',
      queryString: '=',
      filters: '=',
      form: '=',
      sizeX: '=',
      sizeY: '=',
      row: '=',
      col: '=',
      source: '=',
      autoRunQuery: '='
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
          
          
          scope.$watchCollection('queryString', function () {
            if(scope.autoRunQuery){
              scope.$broadcast('queryChanged', 'workbenchVisualization.js'); //triggers reload() in visualizaiton.js
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

              scope.options = scope.options || {};
              scope.options.height = scope.height = height - (header[0].offsetHeight + footer[0].offsetHeight) - 5;

              scope.options.width = scope.width = width;

              // adjust margins on a per chart basis
              if (scope.visualization.name === 'line' || scope.visualization.name === 'yoy') {
                scope.options.height = scope.height -= 75;
                scope.options.width = scope.width -= 50;
              }

              if( /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
                if(scope.height >= 400)
                  scope.options.height = scope.height = 400;
                
              }
              if( /iPad/i.test(navigator.userAgent) ) {
                scope.options.height = scope.height += 67;
              }
            }, 25);
          });
        }
      };
    }
  };
});
