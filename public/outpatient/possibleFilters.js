'use strict';

var angular = require('angular');
var services = require('../scripts/modules').services;
var _ = require('lodash');
angular.module(services.name).factory('possibleFilters', /*@ngInject*/ function ($filter, $q, FormResource) {
  //TODO move type & field? to forms.js
  // All possible filters for a data set
  var possibles;
  var possibleFilters;

  var getPossibleFiltersFn = function (fields) {
    var reduced = fields.reduce(function (filters, field) {
      if (field.enabled && field.isFilter) {
        var possibleFilter = possibles[field.name];
        if (possibleFilter) {
          filters[field.name] = angular.extend({}, { values: field.values }, possibleFilter);
        } else {
          //dynamic field
          filters[field.name] = {
            filterID: field.name,
            type: field.filter.type || 'text',
            field: field.field !== undefined ? field.field : field.name,
            name: $filter('i18next')(field.localeName),
            values: field.values
          };
        }
      }
      return filters;
    }, {});
    return reduced;
  };

  var getAggregablesFn = function (fields) {
    var aggs = [];
    angular.forEach(fields, function (field) {
      if (field.enabled && field.aggregable) {
        var display = possibles[field.name] ? possibles[field.name] : field;
        display = $filter('i18next')(display.name);
        aggs.push({ value: field.name, label: display });
      }
    });
    return aggs;
  };


  var getFormData = function () {
    var deferred = $q.defer();

    FormResource.search(
      {
        q: "name:site"
      },
      function (response) {
        return response.results[0]._source.fields;
      }).$promise.then(function (resp) {


        possibles = resp.results[0]._source.fields.reduce(function (filters, filter) {
          //name -> filterID
          //name -> field
          //localeName -> name
          filters[filter.name] = {
            filterID: filter.name,
            type: filter.filter.type || 'text',
            name: filter.localeName,
            field: filter.field !== undefined ? filter.field : filter.name,
            nested: (filter.nested !== undefined ? filter.nested : false)
          };

          return filters;
        }, {});

        deferred.resolve(possibles);
      });
    return deferred.promise;
  };

  possibles = getFormData().then(function(data){
    
  });

  return {
    possibleFilters: possibles,
    getPossibleFilters: getPossibleFiltersFn,
    getAggregables: getAggregablesFn
  };
});
