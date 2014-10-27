'use strict';

var angular = require('angular');
var controllers = require('../scripts/modules').controllers;

angular.module(controllers.name).controller('WidgetCtrl', /*@ngInject*/ function ($scope, $modal, updateURL) {
  $scope.remove = function (widget) {
    var id = widget.content.id;
    $scope.dashboard.widgets.splice($scope.dashboard.widgets.indexOf(widget), 1);
    updateURL.removeVisualization(id);
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
