'use strict';

var angular = require('angular');
var services = require('../modules').services;

angular.module(services.name).factory('luceneQuery', function ($filter) {

  return {

    getStringQuery: function (value) {
      if (value) {
        return value.trim() === '' ? '*' : value.trim();
      }
      return '*';
    },
    getDateQuery: function (dateValue) {
      if (dateValue) {
        return $filter('date')(dateValue, 'yyyy-MM-dd');
      }
      return '*';
    },
    getQueryString: function (model) {
      return model.modelRef + ': ' + this.getStringQuery(model.filterValue);
    },
    getQueryDateRange: function (model) {
      return model.modelRef + ': [' + this.getDateQuery(model.filterValue.start) + ' TO ' + this.getDateQuery(model.filterValue.end) + ']';
    },
    toQueryString: function (filters) {
      var query = [];
      angular.forEach(filters, function (value, key) {
        if (value.type === 'dateRange') {
          query.push(this.getQueryDateRange(value));
        } else { //currently select, text
          query.push(this.getQueryString(value));
        }
      }, this);
      return query.join(" AND "); //we'll need much better logic here
    }
  };

});
