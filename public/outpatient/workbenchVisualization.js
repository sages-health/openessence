//'use strict';
//
//var angular = require('angular');
//var directives = require('../scripts/modules').directives;
//
//angular.module(directives.name).directive('workbenchVisualization', function ($timeout) {
//  return {
//    template: '<hinge visualization="visualization" pivot="pivot" options="pivotOptions" on-close="close()">' +
//      '<outpatient-visualization visualization="visualization" pivot="pivot" query-string="queryString" filters="filters" options="options"></outpatient-visualization></hinge>',
//    restrict: 'AE',
//    scope: {
//      visualization: '=?',
//      pivot: '=?',
//      pivotOptions: '=',
//      close: '&onClose',
//      queryString: '=',
//      filters: '=',
//      vizGrid: '='
//    },
//    compile: function () {
//      return {
//        pre: function (scope, element) {
//          scope.visualization = scope.visualization || {
//            name: 'table'
//          };
//
//          scope.pivot = scope.pivot || {
//            rows: [],
//            cols: []
//          };
//          scope.options = {
//            width: element.width()
//          };
//
//          scope.options.height = 500;
//
//          scope.$watch('vizGrid.length', function () {
//            $timeout(function () {
//              scope.options = scope.options || {};
//              scope.options.width = element.parent().width();
//
//              if (scope.visualization.name === 'line') {
//                scope.width = scope.options.width -= 50;
//              }
//            });
//          });
//        },
//
//        post: function (scope, element) {
//          element.parent().resizable({
//            helper: 'ui-resizable-helper',
//            handles: 's',
//            stop: function (event, ui) {
//              scope.$apply(function () {
//                element.parent().css('width', '');
//                scope.options.height = ui.size.height - 125;
//                scope.options.width = ui.size.width;
//
//                if (scope.visualization.name === 'line') {
//                  scope.options.height -= 80;
//                  scope.width = scope.options.width -= 50;
//                }
//              });
//            }
//          });
//        }
//      };
//    }
//  };
//});
