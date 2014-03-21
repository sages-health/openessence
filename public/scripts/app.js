'use strict';

var angular = require('angular');
require('angular-animate');
require('angular-resource');
require('angular-sanitize');
require('angular-bootstrap');
require('angular-ui-router');
require('angular-gettext');
var frable = require('../frable');

var modules = require('./modules');
require('./controllers');
require('./services');
require('./directives');
var i18n = require('./i18n');

var dependencies = ['ngAnimate', 'ngResource', 'ngSanitize', 'ui.bootstrap', 'ui.router', 'gettext', frable.name]
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

var previousState = {};
var stateChanged = false; // there's probably a better way to track initial state change, but this works
app.run(function ($rootScope, $state, user) {
  $rootScope.$on('$stateChangeStart', function (event, toState, toParams, fromState, fromParams) {
    if (!stateChanged) {
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
      abstract: true,
      template: require('../partials/home.html'),
      controller: 'MainCtrl'
    })
    .state('home.content', {
      url: '/',
      template: require('../partials/home-content.html'),
      controller: 'HomeCtrl'
    })
    .state('login', {
      url: '/login',
      template: require('../partials/login.html'),
      controller: 'LoginCtrl'
    })
    .state('not-found', {
      url: '/not-found',
      template: require('../partials/not-found.html'),
      controller: 'NotFoundCtrl'
    })
    .state('relogin', {
      url: '/relogin',
      controller: 'ReloginCtrl',
      parent: 'home'
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
    .state('entry', {
      url: '/entry',
      controller: 'EntryCtrl',
      parent: 'home',
      abstract: true,
      template: '<div ui-view></div>'
    })
    .state('entry.visit', {
      url: '/visit',
      template: require('../partials/entry/visit.html'),
      controller: 'VisitEntryCtrl'
    });
});

app.config(function ($httpProvider) {
  $httpProvider.interceptors.push('errorInterceptor');
});

app.run(function ($rootScope, gettextCatalog) {
  i18n.strings().then(function (strings) {
    Object.keys(strings).forEach(function (lang) {
      // angular-gettext's JSON format allows for multiple locales in a single bundle
      // we don't use that now, but we may in the future
      gettextCatalog.setStrings(lang, strings[lang]);
    });
    gettextCatalog.currentLanguage = document.documentElement.lang;
    gettextCatalog.debug = angular.element('meta[name="_environment"]').attr('content') === 'development';

    $rootScope.$digest();
  });
});

module.exports = app;
