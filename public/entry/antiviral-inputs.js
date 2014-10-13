'use strict';

var angular = require('angular');

// @ngInject
module.exports = function ($parse) {
  return {
    restrict: 'E',
    template: require('./antiviral-inputs.html'),
    compile: function (element, attrs) {
      var fieldsExp = $parse(attrs.fields);

      return {
        post: function (scope) {
          scope.fields = fieldsExp(scope);
        }
      };
    }
  };
};

angular.module(require('../scripts/modules').directives.name).directive('antiviralInputs', module.exports);
