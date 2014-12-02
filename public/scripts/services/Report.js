'use strict';

// @ngInject
module.exports = function ($resource) {
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
