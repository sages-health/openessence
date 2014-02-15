'use strict';

var angular = require('angular');
var controllers = require('../controllers');
require('../services/user');

var NAME = 'MainCtrl';

angular.module(controllers.name).controller(NAME, function ($scope, $location, user) {
  if (!user.username) {
    $location.path('/login').replace();
    return;
  }
});

module.exports = NAME;
