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
            var lis = angular.element('li.dashboard-widget');
            angular.forEach(lis, function (value) {
              if (value.contains(element[0])) {
                var parent = angular.element(value);
                var height = parent.height();
                var width = parent.width();
                scope.options.height = scope.height = height - 30;//parent.height();// - 80;// - 20 - 80;
                scope.options.width = scope.width = width - 30;//parent.width();// - 100;// - 20;

                parent.find('.panel').css({
                  width: width,
                  height: height
                })
                  .find('.panel-body').css({
                    width: width,
                    height: height - 50
                  });
              }
            });
          });
        }
      };
    }
  };
});
