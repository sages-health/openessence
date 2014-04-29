'use strict';

var angular = require('angular');
var services = require('../modules').services;

angular.module(services.name).factory('Session', function ($resource) {
  return $resource('/session/browserid', {
    assertion: '@assertion'
  }, {
    delete: {
      method: 'DELETE',

      // Disable our custom HTTP error handling so we don't get extraneous errors from 401s when Firefox over-zealously
      // tries to destroy session on page load. You can still handle any errors manually, if you really want to
      errorInterceptor: false
    }
  });
});
