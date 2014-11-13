'use strict';

var angular = require('angular');
var moment = require('moment');

// @ngInject
module.exports = function ($scope, $window, $location, $document, gettextCatalog, user, visualization, //
                           OutpatientVisitResource) {
  $scope.export = function () {
    var title = $scope.report.name.replace(/ /g, '_');
    var lang = $document[0].documentElement.lang;
    var params = angular.copy($scope.params);
    params.print = false;

    $window.location = '/reports/' + title + '?size=1100px*550px&name=' + title + '&url=/' + lang +
      '/weekly-report?params=' + btoa(JSON.stringify(params));
  };
  $scope.userString = gettextCatalog.getString('Created by') + ': ' + user.getUser().username;
  $scope.todayString = gettextCatalog.getString('Date of Report') + ': ' + moment().format('D MMMM YYYY');

  $scope.params = JSON.parse(atob($location.search().params));
  $scope.allowExport = $scope.params.print === false ? false : true;
  $scope.report = angular.copy($scope.params);
  $scope.report.week = moment($scope.report.endDate).format('W'); // ISO week
  $scope.report.year = moment($scope.report.endDate).format('GGGG'); // ISO year
  $scope.report.endDateString = moment($scope.report.endDate).format('D MMMM YYYY');
  $scope.report.startDate = moment($scope.report.endDate).subtract('weeks', 1).toDate();
  var dateFormat = 'YYYY-MM-DD';
  var startDate = moment($scope.report.startDate).format(dateFormat);
  var endDate = moment($scope.report.endDate).format(dateFormat);
  var dateString = 'visitDate: [' + startDate + ' TO ' + endDate + ']';
  $scope.getSymptomCount = function (symptomsAll, symptom) {
    var result = symptomsAll.filter(function (val) {
      return val.name === symptom;
    });
    return result.length > 0 ? result[0].count : '';
  };

  OutpatientVisitResource.search({
      q: dateString,
      size: 100,
      sort: 'medicalFacility.location.district.raw:asc'
    },
    function (response) {
      $scope.$data = response.results;
    }
  );
};
