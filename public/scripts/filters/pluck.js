'use strict';

var angular = require('angular');
var filters = require('../modules').filters;

angular.module(filters.name).filter('pluck', function () {
  return function (input, field) {
    if (!input) {
      return [];
    }

    return input.map(function (i) {
      return i[field];
    });
  };
});
