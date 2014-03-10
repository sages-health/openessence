'use strict';

var angular = require('angular');
var services = require('../modules').services;
var humane = require('humane-js');

angular.module(services.name).factory('notification', function () {
  var error = humane.create({
    addnCls: 'humane-error'
  });
  var info = humane.create({
    addnCls: 'humane-info'
  });

  return {
    error: function (message) {
      error.log(message);
    },
    info: function (message) {
      info.log(message);
    }
  };
});
