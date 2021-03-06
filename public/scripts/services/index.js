'use strict';

var services = require('../modules').services;

services.factory('aggregateReportModal', require('./reports/aggregateReportModal'))
  .factory('visitsReportModal', require('./reports/visitsReportModal'))
  .factory('crud', require('./crud'))
  .factory('Dashboard', require('./Dashboard'))
  .factory('errorInterceptor', require('./errorInterceptor'))
  .factory('locale', require('./locale'))
  .factory('notification', require('./notification'))
  .factory('Report', require('./Report'))
  .factory('scopeToJson', require('./scopeToJson'))
  .factory('sortString', require('./sortString'))
  .factory('stringUtil', require('./stringUtil'))
  .factory('tableUtil', require('./tableUtil'))
  .factory('EditSettings', require('./EditSettings'))
  .factory('updateURL', require('./updateURL'))
  .factory('user', require('./user'))
  .factory('version', require('./version'))
  .factory('visualization', require('./visualization'))
  .factory('Workbench', require('./Workbench'));

// maybe one day we'll need to require() constants, but not today
require('./constants');

var resources = require('./resources');
Object.keys(resources).forEach(function (resourceName) {
  services.factory(resourceName + 'Resource', resources[resourceName]);
});
