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
          scope.visit = scope.visit || {};
          scope.visit.patient = scope.visit.patient || {};
          scope.visit.patient.age = scope.visit.patient.age || {};
          scope.visit.patient.age.years = scope.visit.patient.age.years || {};

          // IDs of warning messages. The actual messages are stored in the views (where they should be).
          scope.warnings = {
            years: null,
            months: null
          };

          var dateOfBirthToYears = function (dateOfBirth) {
            // this assumes years are 365 days, which is obviously not always true, but it's what moment.js does
            return Math.floor((Date.now() - dateOfBirth.getTime()) / (1000 * 60 * 60 * 24 * 365));
          };

          var dateOfBirthToMonths = function (dateOfBirth) {
            var years = dateOfBirthToYears(dateOfBirth);

            // months are only used if you're < 1 year old
            if (years === 0) {
              // months are defined as intervals of 30 days, NOT calendar months
              return Math.floor((Date.now() - dateOfBirth.getTime()) / (1000 * 60 * 60 * 24 * 30));
            } else {
              var years_in_ms = years * (1000 * 60 * 60 * 24 * 365)
              return Math.floor((Date.now() - (dateOfBirth.getTime() + years_in_ms)) / (1000 * 60 * 60 * 24 * 30));
            }
          };

          // set patient's age based on date of birth
          scope.$watch('visit.patient.dateOfBirth', function (dateOfBirth) {
            if (!dateOfBirth) {
              return;
            } else if (!angular.isDate(dateOfBirth)) {
              dateOfBirth = new Date(dateOfBirth);
            }

            // save a copy so we can yell at user when they edit age
            scope.expectedAge = {
              years: dateOfBirthToYears(dateOfBirth),
              months: dateOfBirthToMonths(dateOfBirth)
            };

            scope.visit.patient.age = {
              years: scope.expectedAge.years,
              months: scope.expectedAge.months
            };
          });

          scope.$watch('visit.patient.age.years', function setYearWarningID (years) {
            scope.warnings.years = (function () {
              if (years === 999) { // do this first since 999 > max so isInvalid will return true
                return '999';
              }

              if (scope.isInvalid(scope.visitForm.years)) {
                // don't issue a warning when there's already an error
                return null;
              }

              if (years > 120) {
                return 'old';
              }

              var dateOfBirth = scope.visit.patient.dateOfBirth;
              if (dateOfBirth) {
                if (!angular.isDate(dateOfBirth)) {
                  dateOfBirth = new Date(dateOfBirth);
                }

                if (years !== dateOfBirthToYears(dateOfBirth)) {
                  return 'dateOfBirthMismatch';
                }
              }

              return null;
            })();
          });

          scope.$watch('visit.patient.age.months', function setMonthWarningID (months) {
            scope.warnings.months = (function () {
              if (scope.isInvalid(scope.visitForm.months)) {
                return null;
              }

              var dateOfBirth = scope.visit.patient.dateOfBirth;
              if (dateOfBirth) {
                if (!angular.isDate(dateOfBirth)) {
                  dateOfBirth = new Date(dateOfBirth);
                }

                if (months !== dateOfBirthToMonths(dateOfBirth)) {
                  return 'dateOfBirthMismatch';
                }
              }

              return null;
            })();
          });
        }
      };
    }
  };
};

angular.module(require('../scripts/modules').directives.name).directive('ageInputs', module.exports);
