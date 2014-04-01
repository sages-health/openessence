'use strict';

var angular = require('angular');
var controllers = require('../../modules').controllers;

angular.module(controllers.name).controller('VisitEntryCtrl', function ($scope, $http, gettext, gettextCatalog) {
  $scope.agePlaceholder = gettextCatalog.getString(gettext('Patient\'s age'));
  $scope.weightPlaceholder = gettextCatalog.getString(gettext('Patient\'s weight'));
  $scope.yellAtUser = false;

  // TODO get this from codex
  $scope.districts = ['District 1', 'District 2', 'District 3', 'District 4', 'District 5'];
  $scope.symptoms = ['Abdominal Pain', 'Cold', 'Coryza', 'Cough', 'Dehydration'].map(function (s) {
    return [{name: s, val: s}];
  });
  $scope.diagnoses = ['Asthma', 'Bronchitis', 'Cholera', 'Cough', 'Dengue'].map(function (d) {
    return [{name: d, val: d}];
  });

  $scope.isInvalid = function (field) {
    if ($scope.yellAtUser) {
      // if the user has already tried to submit, show them all the fields they're required to submit
      return field.$invalid;
    } else {
      // only show a field's error message if the user has already interacted with it, this prevents a ton of red
      // before the user has even interacted with the form
      return field.$invalid && !field.$pristine;
    }
  };

  $scope.openReportDate = function ($event) {
    $event.preventDefault();
    $event.stopPropagation();
    $scope.reportDateOpened = true;
  };

  $scope.warnSystolic = function (bpSystolic) {
    // 180 is "hypertensive emergency" and 90 is hypotension according to Wikipedia
    return !!bpSystolic && (bpSystolic >= 180 || bpSystolic < 90);
  };

  $scope.warnDiastolic = function (bpDiastolic) {
    return !!bpDiastolic && (bpDiastolic >= 110 || bpDiastolic < 60);
  };

  $scope.submit = function (visitForm) {
    if (visitForm.$invalid) {
      $scope.yellAtUser = true;
      return;
    }

    $http({
      method: 'POST',
      url: '/resources/outpatient-visit',
      data: $scope.visit
    }).success(function () {
      $scope.yellAtUser = false;
      $scope.success = true;
    });
  };
});
