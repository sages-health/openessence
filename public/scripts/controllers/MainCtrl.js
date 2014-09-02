'use strict';

// @ngInject
module.exports = function ($scope, $window, $state, appName, user, visitsReportModal, aggregateReportModal, Dashboard,
                           DashboardResource, WorkbenchResource) {

  $scope.visitsReport = function () {
    visitsReportModal.open();
  };

  $scope.weeklyReport = function () {
    aggregateReportModal.openWeeklyReport();
  };

  $scope.timeseriesReport = function () {
    aggregateReportModal.openTimeseriesReport();
  };

  $scope.appName = appName;

  $scope.user = user;
  $scope.logout = function () {
    // wait for acknowledgement of logout from server before reloading
    $scope.$on('logout', function () { // TODO move to user service
      // TODO implement logout view with a nice message like "Sorry to see you go"

      // for page load for added security so stale data doesn't remain
      $window.location.href = '/';
    });

    user.logout();
  };

  $scope.currentPath = $window.encodeURIComponent($state.href($state.current, $state.params));

  $scope.openDashboard = Dashboard.openModal;

  $scope.dashboards = [];
  $scope.loadDashboards = function () {
    DashboardResource.get({
      sort: 'name',
      size: 5
    }, function (response) {
      $scope.dashboards = response.results.map(function (r) {
        return {
          id: r._id,
          name: r._source.name
        };
      });
    });
  };

  $scope.workbenches = [];
  $scope.loadWorkbenches = function () {
    WorkbenchResource.get({
      sort: 'name',
      size: 5
    }, function (response) {
      $scope.workbenches = response.results;

      // save set of workbenches indexed by their IDs
      $window.sessionStorage.setItem('workbenches', JSON.stringify($scope.workbenches.reduce(function (prev, current) {
        prev[current._id] = current;
        return prev;
      }, {})));
    });
  };
};
