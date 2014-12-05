'use strict';

var angular = require('angular');

// @ngInject
module.exports = function ($scope, visualization, user, dateFilter, $location) {

  $scope.params = JSON.parse(atob($location.search().params));
  $scope.report = angular.copy($scope.params);

  $scope.someText = '';
  $scope.user = user.getUser();
  $scope.today = (new Date()).toString();
  var dateFormat = 'yyyy-MM-dd';
  var startDate = dateFilter($scope.report.startDate, dateFormat);
  var endDate = dateFilter($scope.report.endDate, dateFormat);
  $scope.report.dateString = 'visitDate: [' + startDate + ' TO ' + endDate + ']';

  var fixVisitDate = function (query) {
    var result = query;
    var startPosition = 0;
    var i = -1;

    // Search the string and counts the number of e's
    while (startPosition !== -1) {
      startPosition = result.indexOf('visitDate:', i + 1);
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
    viz.queryString = fixVisitDate(viz.queryString);

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
    var viz = fixVisualization(data.results[0]._source.state);
    viz.options.id = 1;
    $scope.viz = viz;
  });

  visualization.resource.get({q: 'name:"sexbarchart"'}, function (data) {
    var viz = fixVisualization(data.results[0]._source.state);
    viz.options.id = 2;
    $scope.viz1 = viz;
  });

  visualization.resource.get({q: 'name:"symptomspie"'}, function (data) {
    var viz = fixVisualization(data.results[0]._source.state);
    viz.options.id = 3;
    $scope.viz2 = viz;
  });
};
