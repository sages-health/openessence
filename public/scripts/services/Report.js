'use strict';

// @ngInject
module.exports = function ($resource, user) {
  return $resource('/reports/:name',
    {
      name: '@name'
    },
    {
      update: {
        method: 'PUT'
      }
    });
};
