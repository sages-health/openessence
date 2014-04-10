'use strict';

var angular = require('angular');
var controllers = require('../modules').controllers;

angular.module(controllers.name).controller('WorkbenchCtrl', function ($scope) {
  $scope.filters = {};

  // If you delete a visualization from the grid, subsequent elements should "slide" back to fill in the gap. But you
  // don't want their state to change, only their position. E.g. a pie chart should remain a pie chart, even if it's
  // moved to the left by one. So we need to assign unique IDs to each element of the grid, for use by ngRepeat
  // (see "track by").
  var vizId = 0;
  var plusId = -1; // use a single ID for the + icon, since there's only ever one and it has no state

  $scope.rows = [
    [
      {type: 'outpatient-visit', id: vizId++}, // we don't use the type yet, but we might eventually
      {plus: true, id: plusId}
    ]
  ];

  $scope.addVisualization = function () {
    var lastIndex = $scope.rows.length - 1;
    var lastRow = $scope.rows[lastIndex];
    if (lastRow[0].plus) {
      // this row is empty so add it here
      $scope.rows[lastIndex] = [
        {type: 'outpatient-visit', id: vizId++},
        {plus: true, id: plusId}
      ];
    } else {
      if (!lastRow[1].plus) {
        throw new Error('Expected last row to have a plus');
      }

      // replace + with visualization
      $scope.rows[lastIndex][1] = {'type': 'outpatient-visit', id: vizId++};

      // add a new row for the +
      $scope.rows.push([{plus: true, id: plusId}]);
    }
  };

  $scope.removeVisualization = function (rowIndex, colIndex) {
    // flatten the grid of visualizations to make it easier to work with
    var rows = [];
    $scope.rows.forEach(function (r) {
      r.forEach(function (v) {
        rows.push(v);
      });
    });

    // remove visualization in question
    rows.splice(rowIndex * 2 + colIndex, 1);

    // add all the remaining visualizations back to the grid
    rows.forEach(function (r, i) {
      // It's OK that we include visualizations before the deleted one, even though only ones *after* the deleted on
      // should be affected. Why? Because they'll be the same reference and ID as before and so won't be re-rendered
      // during the next $digest
      $scope.rows[Math.floor(i / 2)][i % 2] = r;
    });

    // delete last visualization
    $scope.rows[$scope.rows.length - 1].pop();
    if ($scope.rows[$scope.rows.length - 1].length === 0) {
      $scope.rows.pop(); // delete the empty row
    }
  };
});
