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

  $scope.user = user;

  // this is overkill right now, but it shows how we can have dynamic content
  $scope.dropdownItems = [
    {
      text: 'Settings',
      href: '/#/settings'
    },
    {
      text: 'Logout',
      href: '/#/logout'
    }
  ];
});

module.exports = NAME;
