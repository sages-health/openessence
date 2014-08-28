'use strict';

var angular = require('angular');
var services = require('../modules').services;

angular.module(services.name).constant('lang', document.documentElement.lang);

// TODO move rest of constants here
