'use strict';

var angular = require('angular');

/**
 * Function to convert an Angular scope into a serialization-friendly object.
 */
// @ngInject
module.exports = function () {
  return function (scope) {
    return Object.keys(scope).reduce(function (prev, current) {
      if (!/^\$/.test(current) && current !== 'this' && !angular.isFunction(scope[current])) {
        prev[current] = scope[current];
      }
      return prev;
    }, {});
  };
};
