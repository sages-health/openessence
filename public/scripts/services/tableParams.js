'use strict';

var angular = require('angular');
var services = require('../modules').services;

angular.module(services.name).factory('tableParams', function (FrableParams, sortString) {
  return {
    // scope - $scope from controller
    // resouce - one of the $resource object. ie District, Diagnosis,...
    create: function (scope, resource) {
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
    }
  };
});
