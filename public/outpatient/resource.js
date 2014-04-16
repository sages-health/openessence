'use strict';

var angular = require('angular');
var services = require('../scripts/modules').services;

angular.module(services.name).factory('OutpatientVisit', function ($resource) {
  return $resource('/resources/outpatient-visit/:_id',
    {
      _id: '@_id'
    },
    {
      update: {
        method: 'PUT'
      }
    });
});
