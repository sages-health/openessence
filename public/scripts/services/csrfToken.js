'use strict';

var angular = require('angular');
var services = require('../services');

var NAME = 'csrfToken';

// needs to be a constant so that it can be injected into module config function
angular.module(services.name).constant(NAME, angular.element('meta[name="_csrf"]').attr('content'));

module.exports = NAME;
