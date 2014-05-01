'use strict';

var angular = require('angular');
var controllers = require('../modules').controllers;

angular.module(controllers.name).controller('WorkbenchCtrl', function ($scope, gettextCatalog, FracasGrid) {

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

  $scope.filterGrid = new FracasGrid(4);

  $scope.addFilter = function (type) {
    $scope.filterGrid.add({type: type});
  };

  $scope.removeFilter = function (filter) {
    $scope.filterGrid.remove(filter);
  };

  $scope.$watchCollection(
    function () {
      return $scope.filterGrid
        .toArray()
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

  $scope.$watchCollection(
    function () {
      return $scope.filterGrid.toArray();
    },
    function (filters) {
      $scope.filters = filters.filter(function (f) {
        return !f.plus;
      });
    }
  );

  $scope.vizGrid = new FracasGrid(2);

  $scope.addVisualization = function () {
    $scope.vizGrid.add({type: 'outpatient-visit'});
  };

  $scope.removeVisualization = function (visualization) {
    $scope.vizGrid.remove(visualization);
  };

  // start with one filter and one visualization
  $scope.addFilter('date');
  $scope.addVisualization();
});
