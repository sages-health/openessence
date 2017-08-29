'use strict';

var angular = require('angular');
var services = require('../scripts/modules').services;

[
  {resource: 'OutpatientVisit', url: 'outpatient-visit'} // a change-case module would be so great here
].forEach(function (resourceName) {
    var resourceUrl;
    if (!angular.isString(resourceName)) {
      resourceUrl = '/resources/' + resourceName.url;
      resourceName = resourceName.resource;
    } else {
      resourceUrl = '/resources/' + resourceName.toLowerCase();
    }
    return angular.module(services.name).factory(resourceName + 'Resource', /*@ngInject*/ function ($resource) {
      return $resource(resourceUrl + '/:id',
        {
          id: '@id',
          version: '@version'
        },
        {
          update: {
            method: 'PUT',
            headers: { 'Accept': 'application/json' }
          },
          modify: {
            method: 'POST',
            headers: { 'Accept': 'application/json'},
            url: resourceUrl + '/_update'
          },
          create:{
            method:'POST',
            headers: { 'Accept': 'application/json'},
            url: resourceUrl + '/_update'
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
