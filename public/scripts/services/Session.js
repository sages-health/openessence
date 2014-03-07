'use strict';

var angular = require('angular');
var services = require('../modules').services;

angular.module(services.name).factory('Session', function ($resource) {
  return $resource('/session/browserid', {
    assertion: '@assertion'
  });
});
