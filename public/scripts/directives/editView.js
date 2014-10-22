'use strict';

// @ngInject
module.exports = function () {
  return {
    restrict: 'E',
    template: require('../../partials/edit.html'),
    transclude: true,
    scope: {
      title: '=',
      hideButton: '=',
      buttonText: '=',
      createRecord: '&onCreate'
    }
  };
};
