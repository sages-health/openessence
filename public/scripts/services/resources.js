'use strict';

module.exports = [
  'Dashboard',
  'District',
  'Facility',
  'Form',
  'Locale',
  'User',
  'Visualization',
  'Workbench',
  'CsvMapping'
].reduce(function (resources, resourceName) {
    var resourceUrl = '/resources/' + resourceName.toLowerCase();

    // @ngInject
    resources[resourceName] = function ($resource) {
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
    };

    return resources;
  }, {});
