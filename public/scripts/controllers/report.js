'use strict';

var angular = require('angular');
var controllers = require('../modules').controllers;

var NAME = 'ReportCtrl';

var modalCtrl = function ($scope, $modalInstance, $state, $log, Report, urlToSave) {
  $scope.container = {}; // see https://github.com/angular-ui/bootstrap/issues/969
  $scope.ok = function () {
    $modalInstance.close();
    Report.update({
      name: $scope.container.report.name,
      url: urlToSave
    }).$promise
      .catch(function () {
        // TODO do something
        $log.error('Error saving report');
      })
      .finally(function () {
        $state.go('home');
      });
  };

  $scope.cancel = function () {
    $modalInstance.dismiss('cancel');
    $state.go('home');
  };
};
// b/c ngmin doesn't like anonymous controllers
modalCtrl.$inject = ['$scope', '$modalInstance', '$state', '$log', 'Report', 'urlToSave'];

angular.module(controllers.name).controller(NAME, function ($scope, $modal, $stateParams, $window) {
  $modal.open({
    templateUrl: '/public/partials/save-report-dialog.html',
    controller: modalCtrl,
    scope: $scope,
    resolve: {
      'urlToSave': function () {
        return $window.decodeURIComponent($stateParams.url);
      }
    }
  });
});

module.exports = NAME;
