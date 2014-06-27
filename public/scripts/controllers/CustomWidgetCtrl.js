'use strict';

var angular = require('angular');
var controllers = require('../modules').controllers;

angular.module(controllers.name).controller('CustomWidgetCtrl', function ($scope, $modal) {
  $scope.remove = function (widget) {
    $scope.dashboard.widgets.splice($scope.dashboard.widgets.indexOf(widget), 1);
  };

  $scope.openSettings = function (widget) {
    $modal.open({
      scope: $scope,
      template: require('../../partials/widget-settings.html'),
      controller: 'WidgetSettingsCtrl',
      resolve: {
        widget: function () {
          return widget;
        }
      }
    });
  };
});
