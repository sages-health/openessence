'use strict';

var angular = require('angular');

// @ngInject
module.exports = function () {
  return {
    restrict: 'E',
    template: require('./temperature-inputs.html'),
    scope: true,
    link: function (scope) {
      scope.warning = null;

      scope.$watch('visit.patient.temperature', function setWarning (temperature) {
        scope.warning = (function () {
          if (!temperature && temperature !== 0) {
            return null;
          }

          if (temperature < 35) {
            // typical definition of hypothermia
            return 'low';
          }

          if (temperature > 40) {
            // typical definition of hyperpyrexia
            return 'high';
          }

          return null;
        })();
      });
    }
  };
};

angular.module(require('../scripts/modules').directives.name).directive('temperatureInputs', module.exports);
