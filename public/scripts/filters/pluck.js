'use strict';

// @ngInject
module.exports = function () {
  return function (input, field) {
    if (!input) {
      return [];
    }

    return input.map(function (i) {
      return i[field];
    });
  };
};
