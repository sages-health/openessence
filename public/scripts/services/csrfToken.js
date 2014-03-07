'use strict';

var angular = require('angular');
var services = require('../modules').services;

// needs to be a constant so that it can be injected into module config function
angular.module(services.name).constant('csrfToken', angular.element('meta[name="_csrf"]').attr('content'));
