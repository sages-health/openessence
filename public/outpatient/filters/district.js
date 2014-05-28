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
        var searchParams = {
          size: 100, // TODO search on demand if response indicates there are more records
          sort: 'name'
        };
        District.get(searchParams, function (response) {
          scope.districts = response.results.map(function (r) {
            return r._source.name;
          });
        });

        scope.strings = {
          name: gettextCatalog.getString('Districts'),
          any: gettextCatalog.getString('Any district')
        };

        scope.filter.value = scope.filter.value || '*';

        scope.$watch('filter.value', function (district) {
          if (!district || (Array.isArray(district) && district.length === 0)) {
            district = '*';
          } else if (Array.isArray(district) && district.length > 0) {
            district = '(' + district.join(' OR ') + ')';
          }

          district = district || '*';
          scope.filter.queryString = 'medicalFacility.district:' + district;
        });
      }
    }
  };
});
