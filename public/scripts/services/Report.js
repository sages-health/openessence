'use strict';

var angular = require('angular');
var services = require('../modules').services;

angular.module(services.name).factory('Report', function ($resource) {
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
