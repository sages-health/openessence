'use strict';

var angular = require('angular');
var controllers = require('../modules').controllers;

angular.module(controllers.name).controller('WorkbenchCtrl', function ($scope, gettextCatalog, FracasGrid, District, Symptom) {
  $scope.filters = [
    {
      filterId: 'date'
    }
  ];
  $scope.filterTypes = [
    {
      filterId: 'age',
      type: 'numeric-range',
      field: 'patient.age',
      name: gettextCatalog.getString('Age')
    },
    {
      filterId: 'date',
      type: 'date-range',
      field: 'reportDate',
      name: gettextCatalog.getString('Date')
    },
    {
      filterId: 'districts',
      type: 'multi-select',
      field: 'medicalFacility.district',
      store: {
        resource: District,
        field: 'name'
      },
      name: gettextCatalog.getString('District')
    },
    {
      filterId: 'sex',
      type: 'sex',
      field: 'patient.sex',
      name: gettextCatalog.getString('Sex')
    },
    {
      filterId: 'symptoms',
      type: 'multi-select',
      field: 'symptoms',
      store: {
        resource: Symptom,
        field: 'name'
      },
      name: gettextCatalog.getString('Symptom')
    }
  ];

  $scope.pivotOptions = [
    {
      value: 'sex',
      label: gettextCatalog.getString('Sex')
    },
    {
      value: 'age',
      label: gettextCatalog.getString('Age')
    },
    {
      value: 'symptoms',
      label: gettextCatalog.getString('Symptoms')
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
