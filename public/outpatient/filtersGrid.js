'use strict';

var angular = require('angular');
var directives = require('../scripts/modules').directives;

angular.module(directives.name).directive('outpatientFiltersGrid', /*@ngInject*/ function ($rootScope) {

  return {
    restrict: 'E',
    template: require('./filtersGrid.html'),
    transclude: true,
    scope: {
      activeFilters: '=',
      possibleFilters: '=',
      queryString: '=',
      autoRunQuery: '='
    },
    compile: function () {
      return {
        pre: function (scope) {
          scope.possibleFilters = scope.possibleFilters || {};
          scope.activeFilters = scope.activeFilters || [];
          scope.showFilterGrid = true;
          if(!scope.autoRunQuery)
            scope.autoRunQuery = true;

          scope.autoRunToggle = function(){
            scope.$apply( function(){
              scope.autoRunQuery = !scope.autoRunQuery;
            });
          }

          scope.triggerQuery = function(){
            $rootScope.$broadcast('queryChanged', 'force query run'); //triggers reload() in visualizaiton.js
            $rootScope.$broadcast('tableReload', 'force query run');
          }

          scope.addFilter = function (filter, isFilterEvent) {

            var deref, fieldName;

            fieldName = filter.filterID;

            deref = scope.possibleFilters[fieldName];
            var newFilter = angular.extend({}, scope.possibleFilters[fieldName], filter);

            // group filter needs to translate selected display name to id where filter is added using click through
            if(isFilterEvent && newFilter.type === 'group'){
              newFilter.filterEvent = true;
            }

            if(deref)
              scope.activeFilters.push(newFilter);
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
                scope.addFilter(filter, true);
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

          angular.forEach(scope.filters, function(value) {
            scope.addFilter(value);
          });
        }
      };
    }
  };
});
