'use strict';

var angular = require('angular');

require('../modules').services
  .constant('lang', document.documentElement.lang)
  .constant('appName', angular.element('meta[name="_app-name"]').attr('content'))
  .constant('csrfToken', angular.element('meta[name="_csrf"]').attr('content'))
  .constant('persona', angular.element('meta[name="_persona"]').attr('content') === 'true')
  .constant('mapUrl', angular.element('meta[name="_map-url"]').attr('content'))
  .constant('mapLatitude', angular.element('meta[name="_map-latitude"]').attr('content'))
  .constant('mapLongitude', angular.element('meta[name="_map-longitude"]').attr('content'))
  .constant('commit', angular.element('meta[name="_commit"]').attr('content'))
  .constant('repoUrl', angular.element('meta[name="_repo-url"]').attr('content'));
