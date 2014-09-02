'use strict';

var services = require('../modules').services;

services.factory('aggregateReportModal', require('./reports/aggregateReportModal'))
  .factory('visitsReportModal', require('./reports/visitsReportModal'))
  .factory('crud', require('./crud'))
  .factory('Dashboard', require('./Dashboard'))
  .factory('errorInterceptor', require('./errorInterceptor'))
  .factory('notification', require('./notification'))
  .factory('Report', require('./Report'))
  .factory('scopeToJson', require('./scopeToJson'))
  .factory('sortString', require('./sortString'))
  .factory('tableUtil', require('./tableUtil'))
  .factory('user', require('./user'))
  .factory('version', require('./version'))
  .factory('visualization', require('./visualization'));

// maybe one day we'll need to require() constants, but not today
require('./constants');

var resources = require('./resources');
Object.keys(resources).forEach(function (resourceName) {
  services.factory(resourceName + 'Resource', resources[resourceName]);
});
