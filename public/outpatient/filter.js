'use strict';

var angular = require('angular');
var directives = require('../scripts/modules').directives;
require('./filters');

angular.module(directives.name).directive('outpatientFilter', /*@ngInject*/ function ($compile, $parse) {
  return {
    restrict: 'A',
    replace: true,
    scope: {
      close: '&onClose'
    },
    compile: function (element, attrs) {
      var filterExp = $parse(attrs.outpatientFilter);
      return {
        post: function postLink (scope, element) {
          var filter = filterExp(scope.$parent);
          scope.fracasFilter = filter;
          var tagName = 'outpatient-' + filter.type + '-filter';

          element.append('<' + tagName + ' on-close="close()" fracas-filter="fracasFilter"></' + tagName + '>');
          $compile(element.contents())(scope);
        }
      };
    }
  };
});
