'use strict';

var angular = require('angular');
var services = require('../scripts/modules').services;

angular.module(services.name).factory('OutpatientVisit', function ($resource) {
  return $resource('/resources/outpatient-visit/:_id',
    {
      _id: '@_id',
      version: '@version'
    },
    {
      update: {
        method: 'PUT'
      },
      search: {
        method: 'POST', // really should be GET with body, but you can't do that in HTTP
        url: '/resources/outpatient-visit/search',
        headers: { 'Accept': 'application/json' }
      }
    });
});

angular.module(services.name).factory('District', function ($resource) {
  return $resource('/resources/district/:_id',
    {
      _id: '@_id',
      version: '@version'
    },
    {
      update: {
        method: 'PUT',
        headers: { 'Accept': 'application/json' }
      },
      save: {
        method: 'POST',
        headers: { 'Accept': 'application/json' }
      }
    });
});

angular.module(services.name).factory('Diagnosis', function ($resource) {
  return $resource('/resources/diagnosis/:_id',
    {
      _id: '@_id',
      version: '@version'
    },
    {
      update: {
        method: 'PUT',
        headers: { 'Accept': 'application/json' }
      },
      save: {
        method: 'POST',
        headers: { 'Accept': 'application/json' }
      }
    });
});

angular.module(services.name).factory('Symptom', function ($resource) {
  return $resource('/resources/symptom/:_id',
    {
      _id: '@_id',
      version: '@version'
    },
    {
      update: {
        method: 'PUT',
        headers: { 'Accept': 'application/json' }
      },
      save: {
        method: 'POST',
        headers: { 'Accept': 'application/json' }
      }
    });
});

angular.module(services.name).factory('User', function ($resource) {
  return $resource('/resources/user/:_id',
    {
      _id: '@_id',
      version: '@version'
    },
    {
      update: {
        method: 'PUT',
        headers: { 'Accept': 'application/json' }
      },
      save: {
        method: 'POST',
        headers: { 'Accept': 'application/json' }
      }
    });
});
