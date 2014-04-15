'use strict';

var angular = require('angular');
var directives = require('../scripts/modules').directives;

angular.module(directives.name).directive('fracasFilter', function () {
  return {
    restrict: 'E',
    template: require('./fracas-filter.html'),
    transclude: true,
    scope: {
      name: '@filterName',
      close: '&onClose'
    }
  };
});
