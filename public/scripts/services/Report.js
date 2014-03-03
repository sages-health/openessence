'use strict';

var angular = require('angular');
var services = require('../services');

var NAME = 'Report';

angular.module(services.name).factory(NAME, function ($resource) {
  return $resource('/reports/:name',
    {
      name: '@name'
    },
    {
      update: {
        method: 'PUT'
      }
    });
});

module.exports = NAME;
