'use strict';

var moment = require('moment');

// @ngInject
module.exports = function ($scope, $window, gettextCatalog, user, visualization, OutpatientVisitResource) {

  $scope.userString = gettextCatalog.getString('Created by') + ': ' + user.getUser().username;
  $scope.todayString = gettextCatalog.getString('Date of Report') + ': ' + moment().format('D MMMM YYYY');

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

  OutpatientVisitResource.get({
      q: dateString,
      size: 100,
      sort: 'medicalFacility.district:desc'
    },
    function (response) {
      $scope.$data = response.results;
    }
  );
};
