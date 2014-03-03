'use strict';

var angular = require('angular');
require('angular-resource');
require('angular-sanitize');
require('angular-bootstrap');
require('angular-ui-router');
require('angular-gettext');

var controllers = require('./controllers');
var directives = require('./directives');
var services = require('./services');
var filters = require('./filters');
require('./services/csrfToken');

// controllers must be required up here so any dependent services are initialized first
var loginCtrl = require('./controllers/login');
var mainCtrl = require('./controllers/main');

var i18n = require('./i18n');

var app = angular.module('fracasApp', ['ngSanitize', 'ngResource', 'ui.bootstrap', 'ui.router', 'gettext',
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

app.config(function ($locationProvider, $stateProvider, $urlRouterProvider) {
  $locationProvider.html5Mode(true).hashPrefix('!');
  $urlRouterProvider.otherwise('/'); // TODO show 404 view

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
    });
});

i18n.strings().then(function (strings) {
  angular.element(document).ready(function () {
    app.run(function (gettextCatalog) {
      Object.keys(strings).forEach(function (lang) {
        // angular-gettext's JSON format allows for multiple locales in a single bundle
        // we don't use that now, but we may in the future
        gettextCatalog.setStrings(lang, strings[lang]);
      });
      gettextCatalog.currentLanguage = document.documentElement.lang;
      gettextCatalog.debug = true; // highlight untranslated strings TODO turn this off in production
    });

    angular.bootstrap(document, ['fracasApp']);
  });
});

module.exports = app;
