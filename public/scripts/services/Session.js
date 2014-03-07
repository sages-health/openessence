'use strict';

var angular = require('angular');
var services = require('../modules').services;

var NAME = 'Session';

angular.module(services.name).factory(NAME, function ($resource) {
  return $resource('/session/browserid', {
    assertion: '@assertion'
  });
});

module.exports = NAME;
