'use strict';

var angular = require('angular');
var controllers = require('../scripts/modules').controllers;

angular.module(controllers.name).controller('WidgetSettingsCtrl', function ($scope, $timeout, $rootScope, $modalInstance, widget, dateFilter) {
  $scope.widget = widget;
  $scope.filter = {};
  var dateFormat = 'yyyy-MM-dd';

  var dateFilters = widget.content.filters.filter(function (f) {
    return f.type === 'date-range';
  });

  var getDaysDifference = function (start, end){
    var date1 = new Date(start);
    var date2 = new Date(end);
    var timeDiff = Math.abs(date2.getTime() - date1.getTime());
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  };

  $scope.form = {
    name: widget.name,
    visualization: widget.visualization
  };

  var getQueryString = function (queryString, start, end) {
    // TODO do this better
    var index = queryString.indexOf('reportDate');
    var returnQuery;
    start = dateFilter(start, dateFormat)  || '*';
    end = dateFilter(end, dateFormat)  || '*';
    if (index === -1) {
      if (queryString.length > 0) {
        returnQuery = queryString + ' AND reportDate: [' + start + ' TO ' + end + ']';
      } else {
        returnQuery = queryString + 'reportDate: [' + start + ' TO ' + end + ']';
      }
    } else {
      var regexp = /\w+\:\s\[\d+\-\d+\-\d+\s\w+\s\d+\-\d+\-\d+\]/;
      returnQuery = queryString.replace(regexp, 'reportDate: [' + start + ' TO ' + end + ']');
    }
    return returnQuery;
  };

  //the date window is made rolling in dashboard.js
  //setting the end date to today and adjusting the start date
  //look in dashboard.js for description of how date interval in the dashboard works
  var interval = getDaysDifference(dateFilters[0].from, dateFilters[0].to);
  var now2 = new Date();
  now2.setDate(now2.getDate() - interval);
  $scope.filter.from = now2;
  $scope.filter.to = new Date();

  $scope.dismiss = function () {
    $modalInstance.dismiss();
  };

  //where we assign the new dates to the filters and the queryString
  $scope.submit = function () {
    $scope.queryString = getQueryString(widget.content.queryString, $scope.filter.from, $scope.filter.to);
    widget.content.queryString = $scope.queryString;
    var i = widget.content.filters.indexOf(dateFilters[0]);

    widget.content.filters[i].from = $scope.filter.from;
    widget.content.filters[i].to = $scope.filter.to;
    widget.content.filters[i].queryString = $scope.queryString;

    angular.extend(widget, $scope.form);

    $modalInstance.close(widget);
  };
});
