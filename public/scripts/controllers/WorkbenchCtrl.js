'use strict';

var angular = require('angular');

// @ngInject
module.exports = function ($scope, $location, $timeout, $modal, $window, $stateParams, gettextCatalog, scopeToJson,
                           FormResource, WorkbenchResource, possibleFilters) {

  // TODO make dependent on enabled form fields
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

  FormResource.get({size: 1, q: 'name:demo'}, function (response) {
    if (response.results.length === 0) {
      throw new Error('No configured forms');
    }

    var form = response.results[0]._source;
    $scope.form = form; // need to pass to visualizations

    $scope.possibleFilters = form.fields.reduce(function (filters, field) {
      if (!field.enabled) {
        return filters;
      }

      var possibleFilter = possibleFilters[field.name];
      if (possibleFilter) {
        filters[field.name] = angular.extend({values: field.values}, possibleFilters[field.name]);
      }

      return filters;
    }, {});

    // don't set activeFilters until we know all possibleFilters, otherwise filtersGrid can throw an error
    var workbenchId = $stateParams.workbenchId;
    if (workbenchId) {
      var workbenches = JSON.parse($window.sessionStorage.getItem('workbenches'));
      var workbench = workbenches[workbenchId]._source.state;

      $scope.activeFilters = workbench.filters;
      if (Array.isArray(workbench.visualizations)) {
        workbench.visualizations.forEach(function (v) {
          $scope.addVisualization(v.visualization.name, v);
        });
      }
    } else {
      // default to a single 90 day date filter
      var from = new Date();
      from.setDate(from.getDate() - 90); // 90 days back
      $scope.activeFilters = [
        angular.extend({
          from: from,
          to: new Date()
        }, possibleFilters.visitDate)
      ];

      // TODO don't do this
      $scope.addVisualization();
    }
  });

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
      sizeX: 3,
      sizeY: 4,
      type: 'outpatient-visit',
      visualization: {
        name: name || 'table'
      },
      pivotOptions: $scope.pivotOptions,
      pivot: options.pivot || {
        rows: [],
        cols: []
      }
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
          filterID: filter.filterID,
          value: filter.value
        };
      } else {
        return {
          filterID: filter.filterID,
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
      template: require('../../workbench/save-workbench-modal.html'),
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
};
