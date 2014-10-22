'use strict';

// @ngInject
module.exports = function () {
  return {
    template: require('../../partials/conflict-message.html'),
    restrict: 'E',
    scope: false
  };
};
