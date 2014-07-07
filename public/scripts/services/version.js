'use strict';

var angular = require('angular');
var services = require('../modules').services;

angular.module(services.name).constant('version', angular.element('meta[name="_version"]').attr('content'));
