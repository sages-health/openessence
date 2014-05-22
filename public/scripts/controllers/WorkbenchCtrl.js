'use strict';

var angular = require('angular');
var controllers = require('../modules').controllers;

angular.module(controllers.name).controller('WorkbenchCtrl', function ($scope, gettextCatalog, FracasGrid) {
  $scope.filters = [
    {type: 'date'}
  ];
  $scope.filterTypes = [
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
    },
    {
      type: 'symptoms',
      name: gettextCatalog.getString('Symptom')
    }
  ];


  $scope.vizGrid = new FracasGrid(2);

  $scope.addVisualization = function () {
    $scope.vizGrid.add({type: 'outpatient-visit'});
  };

  $scope.removeVisualization = function (visualization) {
    $scope.vizGrid.remove(visualization);
  };

  $scope.addVisualization();
});
