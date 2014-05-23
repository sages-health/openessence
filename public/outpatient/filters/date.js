'use strict';

var angular = require('angular');
var directives = require('../../scripts/modules').directives;

angular.module(directives.name).directive('outpatientDateFilter', function (gettextCatalog, dateFilter) {
  return {
    restrict: 'E',
    template: require('./date.html'),
    transclude: true,
    scope: {
      filter: '=fracasFilter',
      close: '&onClose'
    },
    link: {
      pre: function (scope) {
        scope.strings = {
          name: gettextCatalog.getString('Date'),
          start: gettextCatalog.getString('Start'),
          end: gettextCatalog.getString('End')
        };

        // TODO get rid of row and col from filter (but might be useful to see if filter has been added to panel yet)
        if (scope.filter.row === 0 && scope.filter.col === 0 && !scope.filter.from && !scope.filter.to) {
          var now = new Date();
          now.setDate(now.getDate() - 90); // 90 days back
          scope.filter.from = now; // match elasticsearch terminology
          scope.filter.to = new Date();
        }
        if (scope.filter.value) {
          scope.filter.from = scope.filter.value;
          scope.filter.to = scope.filter.value;
        }

        var toQueryString = function (start, end) {
          var dateFormat = 'yyyy-MM-dd'; // who needs moment.js?
          start = dateFilter(start, dateFormat) || '*';
          end = dateFilter(end, dateFormat) || '*';
          return 'reportDate: [' + start + ' TO ' + end + ']';
        };

        scope.$watchCollection('[filter.from, filter.to]', function (range) {
          scope.filter.queryString = toQueryString(range[0], range[1]);
        });
      }
    }
  };
});
