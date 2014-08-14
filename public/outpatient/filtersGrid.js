'use strict';

var angular = require('angular');
var directives = require('../scripts/modules').directives;

angular.module(directives.name).directive('outpatientFiltersGrid', function (gettextCatalog, $rootScope) {

  return {
    restrict: 'E',
    template: require('./filtersGrid.html'),
    transclude: true,
    scope: {
      filters: '=',
      filterTypes: '=',
      queryString: '='
    },
    compile: function () {
      return {
        pre: function (scope) {
          scope.filterTypes = scope.filterTypes || [];
          scope.filters = scope.filters || [];

          /**
           * Applies pre-defined filter configs to a filter
           */
          var makeFilter = function (filter) {
            var filterTypes = scope.filterTypes.filter(function (filterType) {
              return filterType.filterId === filter.filterId;
            });
            if (filterTypes.length === 0) {
              throw new Error('Unrecognized filterId ' + filter.filterId);
            }

            return angular.extend({}, filterTypes[0], filter);
          };

          scope.filters = scope.filters.map(makeFilter);

          scope.addFilter = function (filter) {
            scope.filters.push(makeFilter(filter));
          };

          scope.removeFilter = function (index) {
            scope.filters.splice(index, 1);
          };

          scope.$watchCollection(
            function () {
              return scope.filters
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

          $rootScope.$on('filterError', function(event, response){
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
