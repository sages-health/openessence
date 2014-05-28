'use strict';

var angular = require('angular');
var directives = require('../../scripts/modules').directives;

angular.module(directives.name).directive('outpatientDistrictsFilter', function (gettextCatalog, District) {
  return {
    restrict: 'E',
    template: require('./district.html'),
    scope: {
      filter: '=fracasFilter',
      close: '&onClose'
    },
    link: {
      pre: function (scope) {
        scope.strings = {
          name: gettextCatalog.getString('Districts'),
          any: gettextCatalog.getString('Any district')
        };
        scope.filter.value = scope.filter.value || '*';

        var searchParams = {
          size: 100, // TODO search on demand if response indicates there are more records
          sort: 'name'
        };
        District.get(searchParams, function (response) {
          scope.districts = response.results.map(function (r) {
            return r._source.name;
          });
          if (scope.filter.value !== '*') {
            var index = scope.districts.indexOf(scope.filter.value);
            if (index < 0) {
              scope.districts.push(scope.filter.value);
            }
          }

          scope.$watch('filter.value', function (district) {
            if (Array.isArray(district)) {
              if (district.length > 1) {
                district = '("' + district.join('" OR "') + '")';
              } else if (district.length === 1 && district[0] !== '*') {
                district = district[0] ? ('"' + district[0] + '"') : '*';
              } else {
                // empty array
                district = '*';
              }
            } else if (district !== '*') {
              district = district ? ('"' + district + '"') : '*';
            }
            scope.filter.queryString = 'medicalFacility.district:' + district;
          });
        });
      }
    }
  };
});
