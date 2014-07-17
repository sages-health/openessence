'use strict';

var angular = require('angular');
var filters = require('../modules').filters;

angular.module(filters.name).filter('object2Array', function () {
  return function (input) {
    var out = [];
    for (var i in input) { // TODO use Object.keys
      out.push(input[i]);
    }
    return out;
  };
});
