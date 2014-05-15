'use strict';

var angular = require('angular');
var directives = require('../../scripts/modules').directives;

angular.module(directives.name).directive('outpatientPhoneidFilter', function (gettextCatalog) {
  return {
    restrict: 'E',
    template: require('./phoneid.html'),
    transclude: true,
    scope: {
      filter: '=fracasFilter',
      close: '&onClose'
    },
    link: {
      pre: function (scope) {
        scope.strings = {
          name: gettextCatalog.getString('Phone ID')
        };

        scope.filter.value = '';

        scope.$watch('filter.value', function (phoneId) {
          phoneId = phoneId || '*';
          scope.filter.queryString = 'phoneId:' + phoneId;
        });
      }
    }
  };
});
