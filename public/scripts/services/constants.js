'use strict';

var angular = require('angular');

require('../modules').services
  .constant('lang', document.documentElement.lang)
  .constant('appName', angular.element('meta[name="_app-name"]').attr('content'))
  .constant('csrfToken', angular.element('meta[name="_csrf"]').attr('content'))
  .constant('persona', angular.element('meta[name="_persona"]').attr('content') === 'true');
