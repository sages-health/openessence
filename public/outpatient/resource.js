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

angular.module(services.name).factory('District', function ($resource) {
  return $resource('/resources/district/:_id',
    {
      _id: '@_id'
    },
    {
      update: {
        method: 'PUT'
      }
    });
});


angular.module(services.name).factory('Diagnosis', function ($resource) {
  return $resource('/resources/diagnosis/:_id',
    {
      _id: '@_id'
    },
    {
      update: {
        method: 'PUT'
      }
    });
});


angular.module(services.name).factory('Symptom', function ($resource) {
  return $resource('/resources/symptom/:_id',
    {
      _id: '@_id'
    },
    {
      update: {
        method: 'PUT'
      }
    });
});
