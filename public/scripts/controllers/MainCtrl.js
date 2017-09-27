'use strict';

// @ngInject
module.exports = function ($timeout, $filter, $scope, $window, $location, $state, appName, user, commit, deployDate, repoUrl, visitsReportModal, aggregateReportModal,//
                           Workbench, Dashboard, DashboardResource, WorkbenchResource, FormResource, $rootScope, locale, tmhDynamicLocale, datepickerPopupConfig, scopeToJson) {
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

  $scope.workbench = {};
  $scope.dashboard = {};

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

  $scope.saveWorkbench = function () {

    var state = {
      name: $scope.workbench.workbenchName || '',
      state: $scope.workbench
    };
    if ($scope.workbench.workbenchId) {
      Workbench.update(state, $scope.workbench.workbenchId);
    } else {
      Workbench.save(state);
    }

    // Store a copy of the original workbench definition because if user updates the workbench name via the
    // xeditable widget, we'll have to send the new workbench name and the original (last saved) workbench
    // definition to the server, which doesn't support updating just the name.
    //angular.copy($scope.workbench, $scope.workbench.originalWorkbench);
  };

  $scope.saveAsWorkbench = function () {
    var scopeJson = scopeToJson($scope.workbench);
    delete scopeJson.form;
    delete scopeJson.possibleFilters;
    delete scopeJson.pivotOptions;

    var state = {
      name: $scope.workbenchName || '',
      state: scopeJson
    };
    Workbench.save(state);
  };

  $scope.setWorkbenchJson = function(value){
    $scope.workbench = value;
  }

  $scope.saveDashboard = function () {
    var state = angular.copy($scope.dashboard);
    state = state.dashboard;
    delete state.form;
    if(state.widgets) {
      state.widgets.forEach(function (w) {
        if (w.content) {
          delete w.content.fields;
          delete w.content.form;
        }
      });
    }
    if ($scope.dashboardId) {
      Dashboard.update(Dashboard.state(state), $scope.dashboard.dashboardId);
    } else {
      Dashboard.save(Dashboard.state(state));
    }

    // Store a copy of the original dashboard definition because if user updates the dashboard name via the
    // xeditable widget, we'll have to send the new dashboard name with the original (last saved) dashboard
    // definition to the server, which doesn't support updating just the name.
    //$scope.workbench.originalDashboard = angular.copy(Dashboard.state(state));
  };

  $scope.saveAsDashboard = function () {
    var state = angular.copy($scope.dashboard);
    state = state.dashboard;
    delete state.form;
    if(state.widgets) {
      state.widgets.forEach(function (w) {
        if (w.content) {
          delete w.content.fields;
          delete w.content.form;
        }
      });
    }

    Dashboard.save(Dashboard.state(state));
  };

  $scope.setDashboardJson = function(value){
    $scope.dashboard = value;
  }

};
