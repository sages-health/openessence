'use strict';

var angular = require('angular');
var directives = require('../modules').directives;

angular.module(directives.name).directive('conflictMessage', function () {
  return {
    template: require('../../partials/conflict-message.html'),
    restrict: 'E',
    scope: false
  };
});
