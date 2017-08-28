'use strict';

// @ngInject
module.exports = function ($timeout, $filter, $scope, $window, $location, $state, appName, user, commit, deployDate, repoUrl, visitsReportModal, aggregateReportModal,//
                           Workbench, Dashboard, DashboardResource, WorkbenchResource, FormResource, $rootScope, locale, tmhDynamicLocale, datepickerPopupConfig) {
  // ****** Start Locale
  $scope.localeSelect2Options = [{value: 'en', label: 'English'}, {value: 'es', label: 'Spanish'}];
  $scope.site = {locale: locale.getLocale()};

  if ($scope.site.locale == 'es') {
    tmhDynamicLocale.set('es-hn');
  } else if ($scope.site.locale = 'en') {
    tmhDynamicLocale.set('en-us');
  }

  $scope.$watch('site.locale', function (newVal, oldVal) {
    if ($scope.site.locale == 'es') {
      tmhDynamicLocale.set('es-hn');
    } else if ($scope.site.locale = 'en') {
      tmhDynamicLocale.set('en-us');
    }

    console.log('locale is:' + $scope.site.locale);

    if (oldVal !== newVal) {
      $window.location.href =
        location.origin + location.pathname.replace('/' + oldVal + '/', '/' + newVal + '/') + location.search;
    }
  });
  // ****** End Locale

  $scope.navbar = {
    collapse: true
  };

  $scope.isActive = function (viewLocation) {
    return $location.path().substring(0, viewLocation.length) === viewLocation;
  };

  var loadConfig = function () {
    FormResource.get({size: 1, q: 'name:site'}, function (response) {
      if (response.results.length === 0) {
        console.error('No configured forms');
        $scope.isSiteConfig = false;
      } else {
        $scope.isSiteConfig = true;
      }
    });
  };

  loadConfig();
  $rootScope.$on('configChange', loadConfig);

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
  $scope.commit = commit;
  $scope.deployDate = deployDate;
  $scope.repoUrl = repoUrl; 
  
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
  $scope.aboutDashboard = Dashboard.aboutModal;

  $scope.openWorkbench = Workbench.openModal;

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
