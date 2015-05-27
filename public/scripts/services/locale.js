'use strict';

var angular = require('angular');

// @ngInject
module.exports = function ($rootScope, $document) {
  var lang = angular.element('html').attr('lang');
  var locale = lang ? lang : '';

  return {
    getLocale: function () {
      return locale;
    },
    setLocale: function (_locale) {
      locale = _locale;
      $document[0].documentElement.lang = locale;
      $rootScope.$broadcast('changeLocale', locale);
    }
  };
};
