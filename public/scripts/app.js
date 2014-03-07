'use strict';

var angular = require('angular');
require('angular-animate');
require('angular-resource');
require('angular-sanitize');
require('angular-bootstrap');
require('angular-ui-router');
require('angular-gettext');
require('angular-toaster');

var controllers = require('./controllers');
var directives = require('./directives');
var services = require('./services');
var filters = require('./filters');

require('./services/csrfToken');
var errorInterceptor = require('./services/error-interceptor');

var loginCtrl = require('./controllers/login');
var mainCtrl = require('./controllers/main');
var reportCtrl = require('./controllers/report');
var notFoundCtrl = require('./controllers/notFound');
var reloginCtrl = require('./controllers/relogin');

var i18n = require('./i18n');

var app = angular.module('fracasApp', ['ngAnimate', 'ngResource', 'ngSanitize',
                                       'ui.bootstrap', 'ui.router', 'gettext', 'toaster',
                                       controllers.name, directives.name, services.name, filters.name]);

app.config(function ($httpProvider, csrfToken) {
  ['post', 'put', 'delete', 'patch'].forEach(function (method) {
    // ng doesn't have default DELETE header
    if (!$httpProvider.defaults.headers[method]) {
      $httpProvider.defaults.headers[method] = {};
    }
    $httpProvider.defaults.headers[method]['X-CSRF-TOKEN'] = csrfToken;
  });
});

var previousState = {};
app.run(function ($rootScope) {
  $rootScope.$on('$stateChangeStart', function (event, toState, toParams, fromState, fromParams) {
    if (fromState.url !== '^') {
      previousState = {
        state: fromState,
        params: fromParams,
        path: null // path is only used when transitioning to unknown state
      };
    }
  });
});

angular.module(services.name).factory('previousState', function () {
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
      url: '/',
      templateUrl: '/public/partials/home.html',
      controller: mainCtrl
    })
    .state('login', {
      url: '/login',
      templateUrl: '/public/partials/login.html',
      controller: loginCtrl
    })
    .state('not-found', {
      url: '/not-found',
      templateUrl: '/public/partials/not-found.html',
      controller: notFoundCtrl
    })
    .state('home.relogin', {
      url: 'relogin',
      controller: reloginCtrl
    })
    .state('home.report', {
      url: 'report/:url', // url param gives path to save
      controller: reportCtrl
    })
    .state('home.report.save', {
      url: '/save'
    });
});

app.config(function ($httpProvider) {
  $httpProvider.interceptors.push(errorInterceptor);
});

i18n.strings().then(function (strings) {
  angular.element(document).ready(function () {
    app.run(function ($rootScope, gettextCatalog) {
      Object.keys(strings).forEach(function (lang) {
        // angular-gettext's JSON format allows for multiple locales in a single bundle
        // we don't use that now, but we may in the future
        gettextCatalog.setStrings(lang, strings[lang]);
      });
      gettextCatalog.currentLanguage = document.documentElement.lang;
      gettextCatalog.debug = angular.element('meta[name="_environment"]').attr('content') === 'development';
    });

    angular.bootstrap(document, ['fracasApp']);
  });
});

module.exports = app;
