'use strict';

var angular = require('angular');
var services = require('../modules').services;

var content = angular.element('meta[name="_persona"]').attr('content');
angular.module(services.name).constant('persona', content === 'true');
