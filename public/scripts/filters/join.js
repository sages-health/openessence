'use strict';

var angular = require('angular');
var filters = require('../modules').filters;

angular.module(filters.name).filter('join', function () {
  return function (input, separator) {
    input = input || [];
    separator = separator || ', '; // Array.separator defaults to , which isn't helpful for us

    if (!Array.isArray(input)) {
      input = [input];
    }

    return input.join(separator);
  };
});
