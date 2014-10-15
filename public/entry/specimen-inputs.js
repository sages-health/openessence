'use strict';

var angular = require('angular');

// @ngInject
module.exports = function () {
  return {
    restrict: 'E',
    template: require('./specimen-inputs.html'),
    scope: true
  };
};

angular.module(require('../scripts/modules').directives.name).directive('specimenInputs', module.exports);
