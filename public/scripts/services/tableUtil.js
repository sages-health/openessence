'use strict';

var angular = require('angular');

// @ngInject
module.exports = function (FrableParams, sortString, $rootScope) {
  return {
    /**
     *
     * @param scope $scope from controller
     * @param resource one of the $resource objects, e.g. District, Diagnosis, etc.
     * @returns {FrableParams}
     */
    tableParams: function (scope, resource) {
      return new FrableParams({
        page: 1,
        count: 10,
        sorting: scope.sorting || {}
      }, {
        total: 0,
        counts: [], // hide page count control
        $scope: {
          $data: {}
        },
        getData: function ($defer, params) {
          if (!angular.isDefined(scope.queryString)) {
            // Wait for queryString to be set before we accidentally fetch a bajillion rows we don't need.
            // If you really don't want a filter, set queryString='' or null
            // TODO there's probably a more Angular-y way to do this
            $defer.resolve([]);
            return;
          }

          resource.get({
            q: scope.queryString,
            from: (params.page() - 1) * params.count(),
            size: params.count(),
            sort: sortString.toElasticsearchString(params.orderBy()[0]) // we only support one level of sorting
          }, function (data) {
            params.total(data.total);
            $defer.resolve(data.results);
          });
        }
      });
    },
    addFilter: function (field, value) {
      //TODO multiselect if value.length > ?
      if (value || value === false) {
        var a = [].concat(value);
        a.forEach(function (v) {
          var filter = {
            filterId: field,
            value: v
          };
          $rootScope.$emit('filterChange', filter, true, false);
        });
      }
    }
  };
};
