'use strict';

var angular = require('angular');
var controllers = require('../modules').controllers;

angular.module(controllers.name).controller('WorkbenchCtrl', function ($scope) {
  $scope.filters = {};
  $scope.rows = [
    [
      {type: 'outpatient-visit'}, // we don't use the type yet, but we might eventually
      {plus: true}
    ]
  ];

  $scope.addVisualization = function () {
    var lastRow = $scope.rows[$scope.rows.length - 1];
    if (lastRow[0].plus) {
      // this row is empty so add it here
      $scope.rows[$scope.rows.length - 1] = [
        {type: 'outpatient-visit'},
        {plus: true}
      ];
    } else {
      if (!lastRow[1].plus) {
        throw new Error('Expected last row to have a plus');
      }

      // replace + with visualization
      $scope.rows[$scope.rows.length - 1] = [
        lastRow[0],
        {type: 'outpatient-visit'}
      ];

      // add a new row for the +
      $scope.rows.push([{plus: true}]);
    }
  };
});
