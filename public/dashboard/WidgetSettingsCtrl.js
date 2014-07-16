'use strict';

var angular = require('angular');
var controllers = require('../scripts/modules').controllers;

angular.module(controllers.name).controller('WidgetSettingsCtrl', function ($scope, $timeout, $rootScope, $modalInstance, widget, dateFilter) {
  $scope.widget = widget;
  $scope.filter ={};
  var dateFormat = 'yyyy-MM-dd';

  var dateFilters = widget.content.filters.filter(function (f) {
    return f.type === 'date-range';
  });

  var getDaysDifference = function (start, end){
    var date1 = new Date(start);
    var date2 = new Date(end);
    var timeDiff = Math.abs(date2.getTime() - date1.getTime());
    var diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
    return diffDays;
  };

  //the date window is made rolling in dashboard.js
  //creating a date filter if there is not one already, if there is use that one
  if (dateFilters.length === 0) {
    var now = new Date();
    now.setDate(now.getDate() - 90); // 90 days back
    $scope.filter.from = now;
    $scope.filter.to = new Date();
    var start = dateFilter($scope.filter.from, dateFormat)  || '*';
    var end = dateFilter($scope.filter.to, dateFormat)  || '*';
    $scope.filter.from = start;
    $scope.filter.to = end;
    $scope.interval = getDaysDifference($scope.filter.from, $scope.filter.to);
  } else {
    $scope.filter.from = dateFilters[0].from;
    $scope.filter.to = dateFilters[0].to;
    $scope.interval = getDaysDifference($scope.filter.from, $scope.filter.to);
  }

  $scope.form = {
    name: widget.name,
    visualization: widget.visualization
  };

  var toQueryString = function (start, end) {
    start = dateFilter(start, dateFormat)  || '*';
    end = dateFilter(end, dateFormat)  || '*';
    $scope.filter.from = start;
    $scope.filter.to = end;
    $scope.dateString = 'reportDate: [' + start + ' TO ' + end + ']';
    return $scope.dateString;
  };

  //setting the end date to today and adjusting the start date
  var now2 = new Date();
  now2.setDate(now2.getDate() - $scope.interval);
  $scope.filter.from = now2;
  $scope.filter.to = new Date();

  $scope.dismiss = function () {
    $modalInstance.dismiss();
  };

  //where we assign the new dates to the filters and the queryString
  $scope.submit = function () {
    $scope.queryString = toQueryString($scope.filter.from, $scope.filter.to);
    widget.content.queryString = $scope.queryString;

    if (dateFilters.length > 0) {
      var i = widget.content.filters.indexOf(dateFilters[0]);
      widget.content.filters[i].from = $scope.filter.from;
      widget.content.filters[i].to = $scope.filter.to;
    } else {
      widget.content.filters.push({
        from: $scope.filter.from,
        to:$scope.filter.to,
        queryString: $scope.queryString,
        type: 'date-range'
      });
    }
    angular.extend(widget, $scope.form);

    $modalInstance.close(widget);
  };
});
