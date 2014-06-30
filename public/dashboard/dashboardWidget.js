'use strict';

var angular = require('angular');
var directives = require('../scripts/modules').directives;

angular.module(directives.name).directive('dashboardWidget', function () {
  return {
    restrict: 'E',
    template: '<outpatient-visualization options="options" height="height" width="width"></outpatient-visualization>',
    scope: {
      options: '=',
      sizeX: '=',
      sizeY: '='
    },
    compile: function () {
      return {
        // TODO Improve selector to get dashboard widget?
        pre: function (scope, element) {
          scope.$watchCollection('[sizeX, sizeY]', function () {

            //TODO Adjust for margins, etc...
            scope.height = element.parent().parent().height() - 20 - 80;
            scope.width = element.parent().parent().width() - 20;
          });
        }
      };
    }
  };
});
