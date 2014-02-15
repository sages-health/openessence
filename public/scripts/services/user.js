'use strict';

var angular = require('angular');
var services = require('../services');

var NAME = 'user';

angular.module(services.name).factory(NAME, function () {
  return {
    username: angular.element('meta[name="_username"]').attr('content')
  };
});

module.exports = NAME;
