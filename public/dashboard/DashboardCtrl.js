'use strict';

var angular = require('angular');
var controllers = require('../scripts/modules').controllers;

angular.module(controllers.name).controller('DashboardCtrl', /*@ngInject*/ function ($scope, $stateParams) {
  $scope.dashboardId = $stateParams.dashboardId;
});
