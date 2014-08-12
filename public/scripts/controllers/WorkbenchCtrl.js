'use strict';

var angular = require('angular');
var controllers = require('../modules').controllers;

angular.module(controllers.name).controller('WorkbenchCtrl', function ($scope, $location, $timeout, gettextCatalog,
                                                                       DiagnosisResource, DistrictResource,
                                                                       SymptomResource) {
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
      filterId: 'diagnoses',
      type: 'multi-select',
      field: 'diagnoses.name',
      store: {
        resource: DiagnosisResource,
        field: 'name'
      },
      name: gettextCatalog.getString('Diagnoses')
    },
    {
      filterId: 'districts',
      type: 'multi-select',
      field: 'medicalFacility.district',
      store: {
        resource: DistrictResource,
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
      field: 'symptoms.name',
      store: {
        resource: SymptomResource,
        field: 'name'
      },
      name: gettextCatalog.getString('Symptom')
    }
  ];

  $scope.pivotOptions = [
    {
      value: 'age',
      label: gettextCatalog.getString('Age')
    },
    {
      value: 'districts',
      label: gettextCatalog.getString('District')
    },
    {
      value: 'diagnoses',
      label: gettextCatalog.getString('Diagnoses')
    },
    {
      value: 'sex',
      label: gettextCatalog.getString('Sex')
    },
    {
      value: 'symptoms',
      label: gettextCatalog.getString('Symptoms')
    }
  ];

  $scope.vizMenuOpen = true;
  $scope.vizGrid = [];

  $scope.$watch('vizGrid.length', function (numVizes) {
    if (numVizes % 2 === 0) { // plus is on its own row
      $scope.showButtonText = true; // plenty of space for text
      $scope.centerPlus = true;

      if (numVizes === 0) {
        $timeout(function () {
          $scope.vizMenuOpen = true;
        });
        $scope.menuPosition = 'bottom';
      } else {
        $scope.vizMenuOpen = false;
        // This is a little inconsistent, but this way you don't have to scroll down after opening menu
        $scope.menuPosition = 'top';
      }
    } else {
      $scope.vizMenuOpen = false;
      $scope.showButtonText = false; // conserve space, user's already clicked it anyway
      $scope.menuPosition = 'bottom-left'; // button is at far right, so move menu over
    }
  });

  $scope.addVisualization = function (name, options) {
    options = options || {};

    $scope.vizGrid.push({
      type: 'outpatient-visit',
      visualization: {name: name},
      pivot: options.pivot
    });
  };

  var visualizationName = $location.search().visualization;
  if (visualizationName) {
    var viz = JSON.parse(sessionStorage.getItem('visualization'))[visualizationName];
    var options = {
      pivot: viz.pivot
    };

    $scope.filters = viz.filters.map(function (filter) {
      if (filter.value) {
        return {
          filterId: filter.filterId,
          value: filter.value
        };
      } else {
        return {
          filterId: filter.filterId,
          to: filter.to,
          from: filter.from
        };
      }
    });

    $scope.addVisualization(viz.visualization.name, options);
    $scope.vizMenuOpen = false;
  }

  $scope.removeVisualization = function (visualization) {
    var index = $scope.vizGrid.indexOf(visualization);
    $scope.vizGrid.splice(index, 1);
  };

  $scope.sortableOptions = {
    cursor: 'move',
    opacity: 0.9,
    handle: '.header'
  };
  $scope.$on('visualizationSelect', function (event, name, options) {
    $scope.addVisualization(name, options);
  });
});
