'use strict';

var angular = require('angular');
var controllers = require('../modules').controllers;

angular.module(controllers.name)
  .run(function ($templateCache) {
    // crazy hack to make ui-sortable work
    $templateCache.put('workbench.html', '<workbench-visualization pivot-options="pivotOptions" ' +
      'query-string="queryString" filters="filters" on-close="removeVisualization(viz)" viz-grid="vizGrid" ' +
      'visualization="viz.visualization" pivot="viz.pivot"></workbench-visualization>');
  })
  .controller('WorkbenchCtrl', function ($scope, $location, $timeout, $modal, $window, $stateParams, gettextCatalog,
                                         scopeToJson, DiagnosisResource, DistrictResource, SymptomResource,
                                         WorkbenchResource) {

    $scope.strings = {
      saveTooltip: gettextCatalog.getString('Save this workbench')
    };

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
    $scope.visualizations = [];

    $scope.$watch('visualizations.length', function (numVizes) {
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

      $scope.visualizations.push({
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
      var index = $scope.visualizations.indexOf(visualization);
      $scope.visualizations.splice(index, 1);
    };

    $scope.saveWorkbench = function () {
      $modal.open({
        template: require('../../partials/save-workbench-modal.html'),
        controller: ['$scope', '$modalInstance', function ($scope, $modalInstance) {
          $scope.workbench = {};
          $scope.save = function (form) {
            if (form.$invalid) {
              $scope.yellAtUser = true;
              return;
            }

            $modalInstance.close($scope.workbench.name);
          };

          $scope.cancel = function () {
            $modalInstance.dismiss('cancel');
          };
        }]
      })
        .result
        .then(function (name) {
          new WorkbenchResource({
            name: name,
            state: scopeToJson($scope)
          })
            .$save();
        });
    };

    $scope.sortableOptions = {
      cursor: 'move',
      opacity: 0.9,
      handle: '.header'
    };
    $scope.$on('visualizationSelect', function (event, name, options) {
      $scope.addVisualization(name, options);
    });

    var workbenchId = $stateParams.workbenchId;
    if (workbenchId) {
      var workbenches = JSON.parse($window.sessionStorage.getItem('workbenches'));
      var workbench = workbenches[workbenchId]._source.state;

      $scope.filters = workbench.filters;
      if (Array.isArray(workbench.visualizations)) {
        workbench.visualizations.forEach(function (v) {
          $scope.addVisualization(v.visualization.name, v);
        });
      }
    } else {
      // default to a single 90 day date filter
      var from = new Date();
      from.setDate(from.getDate() - 90); // 90 days back
      $scope.filters = [
        {
          filterId: 'date',
          from: from,
          to: new Date()
        }
      ];
    }
  });
