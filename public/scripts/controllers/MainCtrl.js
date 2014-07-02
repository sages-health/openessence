'use strict';

var angular = require('angular');
var controllers = require('../modules').controllers;

angular.module(controllers.name).controller('MainCtrl', function ($scope, $window, $state, user, visitsReportModal, Dashboard, DashboardResource) {
  $scope.visitsReport = function () {
    visitsReportModal.open();
  };

  $scope.user = user;
  $scope.logout = function () {
    user.logout();

    // wait for acknowledgement of logout from server before reloading
    $scope.$on('logout', function () { // TODO move to user service
      // TODO implement logout view with a nice message like "Sorry to see you go"

      // for page load for added security so stale data doesn't remain
      $window.location.href = '/';
    });
  };

  $scope.currentPath = $window.encodeURIComponent($state.href($state.current, $state.params));

  $scope.openDashboard = Dashboard.openModal;

  $scope.dashboards = [];
  DashboardResource.get({
    sort: 'name',
    size: 15
  }, function (data) {
    for (var index = 0; index < data.results.length; index++) {
      $scope.dashboards.push({id: data.results[index]._id, name: data.results[index]._source.name});
    }
  });
});
