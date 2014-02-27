'use strict';

var angular = require('angular');
var services = require('../services');

var NAME = 'persona';

var content = angular.element('meta[name="_persona"]').attr('content');
angular.module(services.name).constant(NAME, content === 'true');

module.exports = NAME;
