/*!
 * Based on https://github.com/sparkalow/angular-truncate:
 * Copyright (c) 2013 Brian Matthews, MIT License
 */
'use strict';

var angular = require('angular');
var filters = require('../modules').filters;

angular.module(filters.name).filter('truncate', function () {
  return function (input, chars, breakOnWord) {
    if (isNaN(chars)) {
      return input;
    }
    if (chars <= 0) {
      return '';
    }

    if (input && input.length > chars) {
      input = input.substring(0, chars);

      if (!breakOnWord) {
        var lastspace = input.lastIndexOf(' ');
        // get last space
        if (lastspace !== -1) {
          input = input.substr(0, lastspace);
        }
      } else {
        while (input.charAt(input.length - 1) === ' ') {
          input = input.substr(0, input.length - 1);
        }
      }
      return input + '…'; // https://github.com/sparkalow/angular-truncate/pull/5
    }
    return input;
  };
});
