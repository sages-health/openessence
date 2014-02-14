'use strict';

var angular = require('angular');
var services = require('../services');

var userService = function () {
  return {
    username: angular.element('meta[name="_username"]').attr('content')
  };
};
angular.module(services.name).factory('user', userService);

module.exports = userService;
