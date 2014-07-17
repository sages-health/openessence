'use strict';

var angular = require('angular');
var services = require('../modules').services;

angular.module(services.name).factory('version', function ($filter, gettextCatalog) {
  var string = angular.element('meta[name="_version"]').attr('content');
  var commit = angular.element('meta[name="_commit"]').attr('content');
  var date = parseInt(angular.element('meta[name="_deploy-date"]').attr('content'), 10);

  var description = 'v' + string;
  if (commit) {
    description += '-' + commit.substr(0, 7);
  }
  if (date) {
    description += ' ' + gettextCatalog.getString('deployed on') + ' ';
    description += $filter('date')(date, 'yyyy-MM-dd @ HH:mm') + 'Z'; // add 'Z' since the timestamp is in UTC
  }

  return {
    string: string,
    commit: commit,
    date: date,
    description: description
  };
});
