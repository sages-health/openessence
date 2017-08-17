'use strict';

window.global = {};     //to avoid uuid error in rng-browser.js

// jQuery doesn't write to window if you require() it
window.jQuery = window.jQuery || require('jquery');
require('jquery-ui');

// polyfills, try to require only what you need instead of entire es6 polyfills
require('array.prototype.find'); // behind "experimental JS" flag in Chrome < 39, not in IE <= 11
require('string.prototype.endswith'); // not in IE <= 11
if (!Function.prototype.bind) {
  // PhantomJS doesn't have bind, see https://github.com/ariya/phantomjs/issues/10522#issuecomment-50621310
  Function.prototype.bind = require('function-bind');
}

// Order matters! E.g. make sure you require('angular') before something that depends on angular, e.g. angular-animate.
var angular = require('angular');

require('angular-dynamic-locale');
require('i18next');
window.i18n = require('i18next');
require('ng-i18next');

require('angular-animate');
require('angular-resource');
require('angular-sanitize');

// miscellaneous angular plugins, order these are loaded shouldn't matter (as long as they're after angular, and core
// ng modules like angular-animate)
require('angular-bootstrap');
require('angular-ui-router');
require('angular-ui-select');
require('angular-ui-sortable');
//require('angular-gettext');
require('angular-gridster');
require('angular-loading-bar');
require('angular-order-object-by');
require('ng-file-upload');
require('ng-grid');
require('ng-debounce');
require('checklist-model');

require('text-angular-setup');
require('text-angular-sanitize');
require('text-angular'); // must be after the other text-angular resources

require('d3');
require('leaflet');
require('highcharts');
require('highcharts/modules/exporting');
require('highcharts/modules/offline-exporting');
require('drilldown');
require('no-data-to-display');
require('highcharts-ng');
require('ng-table');
require('infinite-scroll');
require('sticky-table-headers');

var frable = require('../frable');
require('../hinge');
require('../config-editor');
require('../crosstab');
require('../fracas-filter');
require('../dashboard');
require('../workbench');
require('../outpatient');
require('../aggregate');
require('../entry');
require('../translation');

var modules = require('./modules');
require('./controllers');
require('./services');
require('./directives');
require('./filters');
require('angular-bootstrap-toggle');
//require('uuid/v4');
require('angular-xeditable');


var dependencies = ['ngAnimate', 'ngResource', 'ngSanitize', 'ui.bootstrap', 'ui.router', 'ui.select', 'ui.sortable',
  'angular-loading-bar', 'debounce', 'gridster', 'textAngular', 'angularFileUpload',
  'ngGrid', 'ngOrderObjectBy', 'highcharts-ng', 'checklist-model', 'ngTable', 'infinite-scroll',
  'jm.i18next', 'tmh.dynamicLocale', frable.name, 'ui.toggle', 'xeditable']
  .concat(Object.keys(modules).map(function (m) {
    return modules[m].name; // 'fracas.filters', 'fracas.services', etc.
  }));

var app = angular.module('fracasApp', dependencies);

app.config(function ($httpProvider, csrfToken) {
  ['post', 'put', 'delete', 'patch'].forEach(function (method) {
    // ng doesn't have default DELETE header
    if (!$httpProvider.defaults.headers[method]) {
      $httpProvider.defaults.headers[method] = {};
    }
    $httpProvider.defaults.headers[method]['X-CSRF-TOKEN'] = csrfToken;
  });
});

angular.module('fracasApp').run(function ($rootScope) {
  $rootScope.safeApply = function (fn) {
    var phase = $rootScope.$$phase;
    if (phase === '$apply' || phase === '$digest') {
      if (fn && (typeof(fn) === 'function')) {
        fn();
      }
    } else {
      this.$apply(fn);
    }
  }
});

// Datepicker Config
app.config(function (tmhDynamicLocaleProvider) {
  tmhDynamicLocaleProvider.localeLocationPattern('/../locale/angular-locale_{{locale}}.js');
});

app.config(function (cfpLoadingBarProvider) {
  // what's the point of having a spinner when we already have a loading bar?
  cfpLoadingBarProvider.includeSpinner = false;
});

app.config(function ($logProvider) {
  // TODO: Turn off For Production!!! or make it automatic in a config at build time :P
  $logProvider.debugEnabled(true);
});

var previousState = {};
var stateChanged = false; // there's probably a better way to track initial state change, but this works
app.run(function ($rootScope, $state, $http, cfpLoadingBar, user, $injector) {

  $rootScope.$on('$stateChangeStart', function (event, toState, toParams, fromState, fromParams) {
    cfpLoadingBar.start();

    if (!stateChanged) {
      if (user.getUser()) {
        $injector.get('$http').defaults.transformRequest = function (data, headersGetter) {
          if ($rootScope.oauth) {
            /*jshint sub:true*/
            headersGetter()['Authorization'] = 'Bearer ' + user.getUser().tokens;
          }
          if (data) {
            return angular.toJson(data);
          }
        };
      }
      // We only "redirect" on initial page load. Once you're in the app, there are better ways of dealing with this
      stateChanged = true;
      if (!user.isLoggedIn()) {
        event.preventDefault();
        $state.transitionTo('login');
      } else if (toState.name === 'login') {
        // user is already logged in and trying to go to login page
        event.preventDefault();
        $state.transitionTo('home');
      }
    }

    if (fromState.url !== '^') {
      previousState = {
        state: fromState,
        params: fromParams,
        path: null // path is only used when transitioning to unknown state
      };
    }
  });

  var incLoadingBar = function () {
    if ($http.pendingRequests.length > 0) {
      cfpLoadingBar.inc();
    } else {
      cfpLoadingBar.complete();
    }
  };

  $rootScope.$on('$stateChangeSuccess', incLoadingBar);
  $rootScope.$on('$stateChangeError', incLoadingBar);
});

angular.module(modules.services.name).factory('previousState', function () {
  return previousState;
});

app.config(function ($locationProvider, $stateProvider, $urlRouterProvider) {
  $locationProvider.html5Mode(true).hashPrefix('!');

  $urlRouterProvider.otherwise(function ($injector, $location) {
    previousState = {
      path: $location.path()
    };
    return '/not-found';
  });

  $stateProvider
    .state('home', {
      template: require('../partials/home.html'),
      controller: 'MainCtrl'
    })
    .state('home.content', {
      url: '/',
      // home.content is the same as the workbench right now, just at a different URL.
      // It may be different in the future though.
      template: require('../workbench/workbench.html'),
      controller: 'WorkbenchCtrl'
    })
    .state('login', {
      url: '/login',
      template: require('../partials/login.html'),
      controller: 'LoginCtrl'
    })
    .state('workbench', {
      url: '/workbench/:workbenchId',
      template: require('../workbench/workbench.html'),
      controller: 'WorkbenchCtrl',
      parent: 'home'
    })
    .state('dashboard', {
      url: '/dashboard/:dashboardId',
      template: '<div class="container-fluid"><dashboard dashboard-id="dashboardId"></dashboard></div>',
      controller: 'DashboardCtrl',
      parent: 'home'
    })
    .state('not-found', {
      url: '/not-found',
      template: require('../partials/not-found.html'),
      controller: 'NotFoundCtrl'
    })
    .state('report', {
      url: '/report/:url', // url param gives path to save
      controller: 'ReportCtrl',
      parent: 'home',
      abstract: true
    })
    .state('report.save', {
      url: '/save'
    })
    .state('visualization-export', {
      url: '/visualization-export',
      template: require('../partials/visualization-export.html'),
      controller: 'VisualizationExportCtrl'
    })
    .state('visualization-report', {
      url: '/visualization-report',
      template: require('../partials/reports/visualization-report.html'),
      controller: 'VisualizationReportCtrl'
    })
    .state('visits-report', {
      url: '/visits-report',
      template: require('../partials/reports/visits-report.html'),
      controller: 'VisitsReportCtrl'
    })
    .state('weekly-report', {
      url: '/weekly-report',
      template: require('../partials/reports/weekly-report.html'),
      controller: 'WeeklyReportCtrl'
    })
    .state('timeseries-report', {
      url: '/timeseries-report',
      template: require('../partials/reports/timeseries-report.html'),
      controller: 'TimeseriesReportCtrl'
    })
    .state('edit', {
      url: '/edit',
      parent: 'home',
      abstract: true,
      template: '<div ui-view></div>'
    })
    .state('edit.visit', { // TODO define this in outpatient module
      url: '/visit',
      template: require('../outpatient/edit.html'),
      controller: 'OutpatientEditCtrl'
    })
    .state('edit.newvisit', { // TODO define this in outpatient module
      url: '/newvisit',
      template: require('../outpatient/new.html'),
      controller: 'OutpatientNewCtrl'
    })
    .state('edit.translation', {
      url: '/translation',
      template: require('../translation/translation-editor.html'),
      controller: 'TranslationEditCtrl'
    })
    .state('edit.user', {
      url: '/user',
      template: require('../partials/edit/user.html'),
      controller: 'UserEditCtrl'
    })
    .state('edit.dashboard', {
      url: '/dashboard',
      template: require('../partials/edit/dashboard.html'),
      controller: 'DashboardEditCtrl'
    })
    .state('edit.visualization', {
      url: '/visualization',
      template: require('../partials/edit/visualization.html'),
      controller: 'VisualizationEditCtrl'
    })
    .state('edit.workbench', {
      url: '/workbench',
      template: require('../partials/edit/workbench.html'),
      controller: 'WorkbenchEditCtrl'
    })
    .state('edit.config', {
      url: '/config',
      template: require('../config-editor/config-editor.html'),
      controller: 'ConfigEditCtrl'
    });
});

app.config(function ($httpProvider) {
  $httpProvider.interceptors.push('errorInterceptor');
});

angular.module('jm.i18next').config(['$i18nextProvider', function ($i18nextProvider) {
  i18n.addPostProcessor('localePostProcessor', function (value, key, options) {
    if (value === '') {
      console.log('key:MISSING[' + key + ']');
      return key;
    }
    return value;
  });
  $i18nextProvider.options = {
    lng: angular.element('html').attr('lang') || 'en',
    useCookie: false,
    useLocalStorage: false,
    fallbackLng: false, // do not use fall back lng so that we can see missing, may be set to true in production
    //fallbackLng: 'en', // may be set this in production
    //sendMissing: true, // if missing key, send that key to server. If set to true, resPostPath will be used to post missing key
    resPostPath: '../locales/add?lng=__lng__&ns=__ns__', // if key/translation not found, send that key (lng and ns are part of URL)
    resGetPath: '../locales?lng=__lng__&ns=__ns__', // get translation URL
    defaultValue: '', // If key not found, set the value to ''
    defaultLoadingValue: 'LOADING', // While loading, display LOADING text
    postProcess: 'localePostProcessor' // once we translate keys, additional processing
  };

}]);

module.exports = app;
