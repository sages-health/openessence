'use strict';

var angular = require('angular');
var services = require('../modules').services;

/**
 * Service to convert search strings.
 *
 * See http://docs.angularjs.org/api/ng/filter/orderBy for Angular's search string syntax.
 * See http://www.elasticsearch.org/guide/en/elasticsearch/reference/current/search-request-sort.html for
 * elasticsearch's search string syntax.
 */
angular.module(services.name).factory('sortString', function () {
  return {
    toAngularString: function (elasticsearchString) {
      if (!elasticsearchString) {
        return '';
      }

      // TODO implement this once we need it
    },

    toElasticsearchString: function (angularString) {
      if (!angularString) {
        return '';
      }

      if (angularString[0] === '+') {
        return angularString.slice(1) + ':asc';
      } else if (angularString[0] === '-') {
        return angularString.slice(1) + ':desc';
      } else {
        // use default direction
        return angularString;
      }
    }
  };
});
