'use strict';

// @ngInject
module.exports = function () {
  return function (input, separator) {
    input = input || [];
    separator = separator || ', '; // Array.separator defaults to , which isn't helpful for us

    if (!Array.isArray(input)) {
      input = [input];
    }

    return input.join(separator);
  };
};
