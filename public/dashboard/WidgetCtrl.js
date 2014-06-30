'use strict';

var angular = require('angular');
var controllers = require('../scripts/modules').controllers;

angular.module(controllers.name).controller('WidgetCtrl', function ($scope, $modal) {
  $scope.remove = function (widget) {
    $scope.dashboard.widgets.splice($scope.dashboard.widgets.indexOf(widget), 1);
  };

  $scope.openSettings = function (widget) {
    $modal.open({
      scope: $scope,
      template: require('./widget-settings.html'),
      controller: 'WidgetSettingsCtrl',
      resolve: {
        widget: function () {
          return widget;
        }
      }
    });
  };
});
