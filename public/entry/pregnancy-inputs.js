'use strict';

var angular = require('angular');

// @ngInject
module.exports = function ($parse) {
  return {
    restrict: 'E',
    template: require('./pregnancy-inputs.html'),
    compile: function (element, attrs) {
      // we're using a non-isolate scope
      var fieldsExp = $parse(attrs.fields);

      return {
        post: function (scope) {
          scope.fields = fieldsExp(scope);
        }
      };
    }
  };
};

angular.module(require('../scripts/modules').directives.name).directive('pregnancyInputs', module.exports);
