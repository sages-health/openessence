'use strict';

var angular = require('angular');
var services = require('../modules').services;

angular.module(services.name).constant('appName', angular.element('meta[name="_app-name"]').attr('content'));
