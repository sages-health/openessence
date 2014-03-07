'use strict';

var angular = require('angular');
var services = require('../modules').services;

var NAME = 'user';

angular.module(services.name).factory(NAME, function () {

  var user = {
    email: angular.element('meta[name="_email"]').attr('content'),

    // useful abstraction in case user identifiers change
    isLoggedIn: function () {
      return !!user.email;
    }
  };

  return user;
});

module.exports = NAME;
