'use strict';

var angular = require('angular');

var controllers = require('../modules').controllers;

angular.module(controllers.name).controller('DashboardCtrl', function ($scope, $stateParams) {
  $scope.dashboardId = $stateParams.dashboardId;
});
