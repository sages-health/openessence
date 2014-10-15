'use strict';

var angular = require('angular');

// @ngInject
module.exports = function () {
  return {
    restrict: 'E',
    template: require('./age-inputs.html'),
    scope: true,
    compile: function () {
      return {
        post: function (scope) {
          // convert date of birth to age in (decimal) years
          var dateToAge = function (dateOfBirth) {
            return (Date.now() - dateOfBirth.getTime()) / (1000 * 60 * 60 * 24 * 365);
          };

          // set patient's age based on date of birth
          scope.$watch('visit.patient.dateOfBirth', function (dateOfBirth) {
            if (!dateOfBirth) {
              return;
            } else if (!angular.isDate(dateOfBirth)) {
              dateOfBirth = new Date(dateOfBirth);
            }

            // this is used to sanity check the age the user inputs
            scope.calculatedAge = dateToAge(dateOfBirth);

            // Round to 2 decimal places. Keep a copy on scope for when patient.age is overwritten.
            scope.roundedCalculatedAge = Math.round(scope.calculatedAge * 100) / 100;

            scope.visit.patient.age = scope.roundedCalculatedAge;
          });

          scope.isAcceptableAge = function (ageInYears, dateOfBirth) {
            if (!dateOfBirth) {
              return true;
            } else if (!angular.isDate(dateOfBirth)) {
              dateOfBirth = new Date(dateOfBirth);
            }

            var expectedAgeInYears = dateToAge(dateOfBirth);

            // In reality, acceptable error is a non-linear function of age, e.g. saying a 1 week old is 1 year old
            // is very different from saying a 33 year old is 34. But this is good enough.
            return Math.abs(expectedAgeInYears - ageInYears) < 1;
          };
        }
      };
    }
  };
};

angular.module(require('../scripts/modules').directives.name).directive('ageInputs', module.exports);
