'use strict';

var angular = require('angular');
var controllers = require('../../modules').controllers;

angular.module(controllers.name).controller('VisitsReportCtrl', function ($scope, $window, visualization, user, dateFilter) {
  $scope.someText = '';
  $scope.user = user.getUser();
  $scope.today = (new Date()).toString();
  $scope.report = $window.opener.report;
  var dateFormat = 'yyyy-MM-dd';
  var startDate = dateFilter($scope.report.startDate, dateFormat);
  var endDate = dateFilter($scope.report.endDate, dateFormat);
  $scope.report.dateString = 'reportDate: [' + startDate + ' TO ' + endDate + ']';

  var fixReportDate = function (query) {
    var result = query;
    var startPosition = 0;
    var i = -1;

    // Search the string and counts the number of e's
    while (startPosition !== -1) {
      startPosition = result.indexOf('reportDate:', i + 1);
      if (startPosition === -1) {
        break;
      }
      var endPosition = result.indexOf(']', startPosition + 1);
      result = result.substr(0, startPosition) + $scope.report.dateString + result.substr(endPosition + 1);
      i = startPosition;
    }
    return result;
  };

  var fixVisualization = function (viz) {

    // fix queryString
    viz.queryString = fixReportDate(viz.queryString);

    // fix date filters
    for (var ix = 0; ix < viz.filters.length; ix++) {
      // Update date filters
      if (viz.filters[ix].type === 'date') {
        viz.filters[ix].from = $scope.report.startDate; //new Date(viz.filters[ix].from);
        viz.filters[ix].to = $scope.report.endDate; // new Date(viz.filters[ix].to);
      }
    }
    return viz;
  };

  //TODO: hardcoded saved query names: weeklyseries, sexbarchart, and symptomspie
  visualization.resource.get({q: 'name:"weeklyseries"'}, function (data) {
    $scope.viz = fixVisualization(data.results[0]._source.state);
  });

  visualization.resource.get({q: 'name:"sexbarchart"'}, function (data) {
    $scope.viz1 = fixVisualization(data.results[0]._source.state);
  });

  visualization.resource.get({q: 'name:"symptomspie"'}, function (data) {
    $scope.viz2 = fixVisualization(data.results[0]._source.state);
  });
});
