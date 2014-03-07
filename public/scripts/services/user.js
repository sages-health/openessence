'use strict';

var angular = require('angular');
var services = require('../modules').services;

angular.module(services.name).factory('user', function () {

  var user = {
    email: angular.element('meta[name="_email"]').attr('content'),

    // useful abstraction in case user identifiers change
    isLoggedIn: function () {
      return !!user.email;
    }
  };

  return user;
});
