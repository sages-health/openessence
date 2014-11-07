'use strict';

var angular = require('angular');
var directives = require('../scripts/modules').directives;

angular.module(directives.name).directive('outpatientFiltersGrid', /*@ngInject*/ function (gettextCatalog, $rootScope) {

  return {
    restrict: 'E',
    template: require('./filtersGrid.html'),
    transclude: true,
    scope: {
      activeFilters: '=',
      possibleFilters: '=',
      queryString: '='
    },
    compile: function () {
      return {
        pre: function (scope) {
          scope.possibleFilters = scope.possibleFilters || {};
          scope.activeFilters = scope.activeFilters || [];

          scope.addFilter = function (filter) {
            scope.activeFilters.push(angular.extend({}, scope.possibleFilters[filter.filterID], filter));
          };

          scope.removeFilter = function (index) {
            scope.activeFilters.splice(index, 1);
          };

          scope.$watchCollection(
            function () {
              return scope.activeFilters
                .map(function (f) {
                  return f.queryString;
                });
            },
            function (queryStrings) {
              var noneEmpty = queryStrings.every(function (s) {
                return !!s;
              });

              if (noneEmpty) { // wait for all filters to be initialized
                scope.queryString = queryStrings.join(' AND ');
              }
            }
          );

          $rootScope.$on('filterChange', function (event, filter, add, fire) {
            var apply = function (filter, add) {
              if (add) {
                scope.addFilter(filter);
              } else {
                scope.removeFilter(filter);
              }
            };
            if (fire) {
              scope.$apply(apply(filter, add));
            } else {
              apply(filter, add);
            }
          });

          scope.$watch('queryString', function () {
            scope.queryForm.queryStrings.$setValidity('syntaxError', true);
          });

          $rootScope.$on('filterError', function (event, response) {
            var requestNum = response.status;
            if (requestNum === 400) {
              scope.queryForm.queryStrings.$setValidity('syntaxError', false);
            }
          });

          scope.isInvalid = function (field) {
            return field.$invalid;
          };
        }
      };
    }
  };
});
