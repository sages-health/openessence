'use strict';

var angular = require('angular');
var directives = require('../scripts/modules').directives;

angular.module(directives.name).directive('outpatientFiltersGrid', function (gettextCatalog, FracasGrid, $rootScope) {

  return {
    restrict: 'E',
    template: require('./filtersGrid.html'),
    scope: {
      filters: '=',
      filterTypes: '=',
      queryString: '='
    },
    compile: function () {

      return {
        pre: function (scope) {

          scope.filters = scope.filters ? scope.filters : [];
          scope.filterGrid = new FracasGrid(4);

          var applyConfig = function (filter) {
            for (var i = 0; i < scope.filterTypes.length; i++) {
              if (scope.filterTypes[i].filterId === filter.filterId) {
                // Make a copy of filter config and apply new filter values
                return angular.extend(angular.copy(scope.filterTypes[i]), filter);
              }
            }
            return null;
          };

          scope.addFilter = function (filter) {
            var filterConfig = applyConfig(filter);
            if (filterConfig) {
              scope.filterGrid.add(filterConfig);
            }
          };

          scope.removeFilter = function (filter) {
            var filterConfig = applyConfig(filter);
            if (filterConfig) {
              scope.filterGrid.remove(filterConfig);
            }
          };

          scope.$watchCollection(
            function () {
              return scope.filterGrid
                .toArray()
                .filter(function (f) {
                  return !f.plus;
                })
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

          scope.$watchCollection(
            function () {
              return scope.filterGrid.toArray();
            },
            function (filters) {
              scope.filters = filters.filter(function (f) {
                return !f.plus;
              });
            }
          );

          angular.forEach(scope.filters, function (value) {
            scope.addFilter(value);
          });
        }
      };
    }
  };
});
