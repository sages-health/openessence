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

          scope.addFilter = function (filter) {
            scope.filterGrid.add(filter);
          };

          scope.removeFilter = function (filter) {
            scope.filterGrid.remove(filter);
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

          $rootScope.$on('filterChange', function (event, filter, add) {
            scope.$apply(function () {
              if (add) {
                scope.addFilter(filter);
              } else {
                scope.removeFilter(filter);
              }
            });
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

          angular.forEach(scope.filters, function(value) {
            scope.addFilter(value);
          });
        }
      };
    }
  };
});
