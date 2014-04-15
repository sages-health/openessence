'use strict';

var angular = require('angular');
var controllers = require('../modules').controllers;

angular.module(controllers.name).controller('WorkbenchCtrl', function ($scope, gettextCatalog) {

  // If you delete a visualization from the grid, subsequent elements should "slide" back to fill in the gap. But you
  // don't want their state to change, only their position. E.g. a pie chart should remain a pie chart, even if it's
  // moved to the left by one. So we need to assign unique IDs to each element of the grid, for use by ngRepeat
  // (see "track by").
  var vizId = 0;
  var filterId = 0;
  var plusId = -1; // use a single ID for the + icon, since there's only ever one and it has no state

  $scope.queryString = '';

  $scope.filterTypes = [ // TODO let outpatient/filters define this
    {
      type: 'age',
      name: gettextCatalog.getString('Age')
    },
    {
      type: 'date',
      name: gettextCatalog.getString('Date')
    },
    {
      type: 'sex',
      name: gettextCatalog.getString('Sex')
    }
  ];

  // flattens a 2D matrix into a vector
  var flattenMatrix = function (matrix) {
    var vector = [];
    matrix.forEach(function (r) {
      r.forEach(function (e) {
        vector.push(e);
      });
    });

    return vector;
  };

  $scope.addFilter = function (type) { // TODO refactor into a fracasGrid service
    var lastIndex = $scope.filterRows.length - 1;
    var lastRow = $scope.filterRows[lastIndex];
    var plus = {plus: true, id: plusId};

    var plusIndex = -1;
    lastRow.forEach(function (filter, index) {
      if (filter.plus) {
        plusIndex = index;
        return true;
      }
    });
    if (plusIndex === -1) {
      throw new Error('Expected last row to have a plus');
    }

    var filter = {
      type: type,
      id: filterId++,
      row: lastIndex,
      col: plusIndex
    };

    // replace + with visualization
    $scope.filterRows[lastIndex][plusIndex] = filter;

    if (plusIndex === 3) {
      // need to add a new row
      $scope.filterRows.push([plus]);
    } else {
      $scope.filterRows[lastIndex][plusIndex + 1] = plus;
    }
  };

  $scope.removeFilter = function (filter) {
    // flatten the grid to make it easier to work with
    var rows = flattenMatrix($scope.filterRows);

    // remove filter in question
    rows.splice(filter.row * 4 + filter.col, 1);

    rows.forEach(function (r, i) {
      r.row = Math.floor(i / 4);
      r.col = i % 4;
      $scope.filterRows[r.row][r.col] = r;
    });

    // delete last filter
    $scope.filterRows[$scope.filterRows.length - 1].pop();
    if ($scope.filterRows[$scope.filterRows.length - 1].length === 0) {
      $scope.filterRows.pop(); // delete the empty row
    }
  };

  $scope.filterRows = [
    [
      {plus: true, id: plusId}
    ]
  ];
  $scope.addFilter('date');

  $scope.$watchCollection(
    function () {
      return flattenMatrix($scope.filterRows)
        .filter(function (f) {
          return !f.plus;
        })
        .map(function (f) {
          return f.queryString;
        });
    },
    function (queryStrings) {
      var noneEmpty = queryStrings.every(function (s) {
        return !!s;
      });

      if (noneEmpty) { // wait for all filters to be initialized
        $scope.queryString = queryStrings.join(' AND ');
      }
    }
  );

  $scope.vizRows = [
    [
      {type: 'outpatient-visit', id: vizId++}, // we don't use the type yet, but we might eventually
      {plus: true, id: plusId}
    ]
  ];

  $scope.addVisualization = function () { // TODO refactor with addFilter()
    var lastIndex = $scope.vizRows.length - 1;
    var lastRow = $scope.vizRows[lastIndex];
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
      $scope.vizRows[lastIndex][1] = {'type': 'outpatient-visit', id: vizId++};

      // add a new row for the +
      $scope.vizRows.push([{plus: true, id: plusId}]);
    }
  };

  $scope.removeVisualization = function (rowIndex, colIndex) {
    // flatten the grid of visualizations to make it easier to work with
    var rows = [];
    $scope.vizRows.forEach(function (r) {
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
      $scope.vizRows[Math.floor(i / 2)][i % 2] = r;
    });

    // delete last visualization
    $scope.vizRows[$scope.vizRows.length - 1].pop();
    if ($scope.vizRows[$scope.vizRows.length - 1].length === 0) {
      $scope.vizRows.pop(); // delete the empty row
    }
  };
});
