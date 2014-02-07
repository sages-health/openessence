require.config({
  baseUrl: 'public/scripts', // in production build, baseUrl doesn't matter since we already have all resources
  paths: {
    angular: '../bower_components/angular/angular'
  },
  shim: {
    angular: {
      exports: 'angular'
    }
  },
  priority: [
    'angular'
  ]
});

// defer ng bootstrap until our module is defined in app.js
window.name = 'NG_DEFER_BOOTSTRAP!';

require(['angular', 'app'], function (angular, app) {
  'use strict';

  angular.resumeBootstrap([app.name]);
});
