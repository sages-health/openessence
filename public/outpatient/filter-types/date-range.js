'use strict';

var angular = require('angular');
var directives = require('../../scripts/modules').directives;

angular.module(directives.name).directive('outpatientDateRangeFilter', function /*@ngInject*/ (gettextCatalog, dateFilter) {
  return {
    restrict: 'E',
    template: require('./date-range.html'),
    transclude: true,
    scope: {
      filter: '=fracasFilter',
      close: '&onClose'
    },
    link: {
      pre: function (scope) {
        scope.strings = {
          start: gettextCatalog.getString('Start'),
          end: gettextCatalog.getString('End')
        };

        if (scope.filter.value) {
          scope.filter.from = scope.filter.value;
          scope.filter.to = scope.filter.value;
        }

        var toQueryString = function (start, end) {
          var dateFormat = 'yyyy-MM-dd'; // who needs moment.js?
          start = dateFilter(start, dateFormat) || '*';
          end = dateFilter(end, dateFormat) || '*';
          return scope.filter.field + ': [' + start + ' TO ' + end + ']';
        };

        scope.$watchCollection('[filter.from, filter.to]', function (range) {
          scope.filter.queryString = toQueryString(range[0], range[1]);
        });
      }
    }
  };
});
