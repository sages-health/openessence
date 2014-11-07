'use strict';

var moment = require('moment');

// @ngInject
module.exports = function ($scope, $window, user, visualization, OutpatientVisitResource) {

  $scope.username = user.getUser().username;
  $scope.dateString = moment().format('D MMMM YYYY');

  $scope.report = $window.opener.report;
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
