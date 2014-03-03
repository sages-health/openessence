'use strict';

var angular = require('angular');
var controllers = require('../controllers');
require('../services/report');

var NAME = 'ReportCtrl';

var modalCtrl = function ($scope, $modalInstance, $state, $location, Report, previousPath) {
  $scope.container = {}; // see https://github.com/angular-ui/bootstrap/issues/969
  $scope.ok = function () {
    $modalInstance.close();
    Report.update({
      name: $scope.container.report.name,
      url: previousPath//$location.path()
    });
    $state.go('home');
  };

  $scope.cancel = function () {
    $modalInstance.dismiss('cancel');
    $state.go('home');
  };
};
// b/c ngmin doesn't like anonymous controllers
modalCtrl.$inject = ['$scope', '$modalInstance', '$state', '$location', 'Report', 'previousPath'];

angular.module(controllers.name).controller(NAME, function ($scope, $modal, previousPath) {
  $modal.open({
    templateUrl: '/public/partials/save-report-dialog.html',
    controller: modalCtrl,
    scope: $scope,
    resolve: {
      'previousPath': function () {
        return previousPath;
      }
    }
  });
});

module.exports = NAME;
