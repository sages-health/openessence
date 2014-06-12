'use strict';

var angular = require('angular');
var services = require('../modules').services;

[
  'Dashboard',
  'District',
  'User',
  'Visualization',
  'Workbench'
].forEach(function (resourceName) {
    var resourceUrl = '/resources/' + resourceName.toLowerCase();
    return angular.module(services.name).factory(resourceName + 'Resource', function ($resource) {
      return $resource(resourceUrl + '/:_id',
        {
          _id: '@_id', // TODO come up with a convention wrt _
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
          },
          search: {
            method: 'POST', // really should be GET with body, but you can't do that in HTTP 1.1
            url: resourceUrl + '/search',
            headers: { 'Accept': 'application/json' }
          }
        });
    });
  });
