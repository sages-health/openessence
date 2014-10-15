'use strict';

var angular = require('angular');

// @ngInject
module.exports = function () {
  return {
    restrict: 'E',
    template: require('./pregnancy-inputs.html'),
    scope: true
  };
};

angular.module(require('../scripts/modules').directives.name).directive('pregnancyInputs', module.exports);
