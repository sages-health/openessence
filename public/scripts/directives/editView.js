'use strict';

var angular = require('angular');
var directives = require('../modules').directives;

angular.module(directives.name).directive('editView', function () {
  return {
    restrict: 'E',
    template: require('../../partials/edit.html'),
    transclude: true,
    scope: {
      title: '=',
      buttonText: '=',
      createRecord: '&onCreate'
    }
  };
});
