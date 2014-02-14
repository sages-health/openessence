'use strict';

var angular = require('angular');
var controllers = require('../controllers');
require('../services/user');

var mainCtrl = function ($scope, $location, user) {
  if (!user.username) {
    $location.path('/login').replace();
    return;
  }
};
angular.module(controllers.name).controller('MainCtrl', mainCtrl);

module.exports = mainCtrl;
