'use strict';

// @ngInject
module.exports = function ($resource) {
  return $resource('/reports/:name', // TODO ReportResource
    {
      name: '@name'
    }
  );
};
