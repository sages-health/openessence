'use strict';

var angular = require('angular');

// @ngInject
module.exports = function ($resource, $scope, $location, $timeout, $modal, $window, $state, $stateParams,//
                           scopeToJson, FormResource, possibleFilters, updateURL, Workbench) {
  var NUM_COLUMNS = 24,
    DEFAULT_SIZE_X = 12,
    DEFAULT_SIZE_Y = 8;

  $scope.gridsterOptions = {
    margins: [10, 10],
    columns: NUM_COLUMNS,
    minRows: 5,
    //minColumns: 11,
    draggable: {
      enabled: true,
      handle: '.viz-drag-handle'
    },
    resizable: {
      enabled: true,
      handles: "e"
    }
  };

  $scope.autoRunQuery = true; //initial state

  $scope.vizMenuOpen = true;
  $scope.visualizations = [];
  $scope.pivotOptions = [];

  var getNextVizId = function () {
    if (!$scope.nextVizId) {
      $scope.nextVizId= 0;
    }
    $scope.nextVizId++;
    return $scope.nextVizId;
  };

  // Sort visualization using row numbers
  // This function is called while loading saved workbench or
  // using URL state variable
  // If visualizations are not sorted using row number,
  // gridster may change row number of widget
  var sortVisualizations = function (a, b) {
    if (a.row === b.row) {
      return 0;
    }
    return (a.row < b.row) ? -1 : 1;
  };

  FormResource.get({size: 1, q: 'name:site'}, function (response) {
    if (response.results.length === 0) {
      console.error('No configured forms');
      $location.path('/edit/config');
      return;
    }

    var form = response.results[0]._source;
    $scope.form = form; // need to pass to visualizations

    $scope.possibleFilters = possibleFilters.getPossibleFilters(form.fields);

    $scope.pivotOptions = possibleFilters.getAggregables(form.fields);

    var workbenchId = $stateParams.workbenchId;
    var state = updateURL.getState();
    $scope.nextVizId = 0;
    $scope.workbenchId = null;
    var visualizationName = $location.search().visualization;

    if (workbenchId) { // if we are loading a saved workbench
      Workbench.get(workbenchId, function (response) {
        $scope.workbenchId = workbenchId;
        $scope.workbenchName = response._source.name;
        var workbench = response._source.state;

        // Store a copy of the original workbench definition because if user updates the workbench name via the
        // xeditable widget, we'll have to send the new workbench name and the original (last saved) workbench
        // definition to the server, which doesn't support updating just the name.
        $scope.originalWorkbench = {};
        angular.copy(workbench, $scope.originalWorkbench);

        $scope.nextVizId = workbench.nextVizId;
        $scope.activeFilters = workbench.activeFilters;

        workbench.visualizations.sort(sortVisualizations);

        if (Array.isArray(workbench.visualizations)) {
          workbench.visualizations.forEach(function (v) {
            $scope.addVisualization(v.visualization.name, v);
          });
        }
      });
    } else if (visualizationName) {
      var viz = JSON.parse(sessionStorage.getItem('visualization'))[visualizationName];
      var options = {
        pivot: viz.pivot
      };
      viz.filters.forEach(function(filter){
        $scope.activeFilters.push(angular.extend({}, $scope.possibleFilters[filter.filterID], filter));
      });

      $scope.addVisualization(viz.visualization.name, options);
      $scope.vizMenuOpen = false;
    } else if (state.visualizations || state.filters) { // if we are loading workbench state - for phantom reports
        state.filters.forEach(function (filter) {
            $scope.activeFilters.push(angular.extend({}, $scope.possibleFilters[filter.filterID], filter));
        });
      //$scope.activeFilters = state.filters || [];
      if (Array.isArray(state.visualizations)) {
        state.visualizations.sort(sortVisualizations);

        state.visualizations.forEach(function (v) {
          var id = v.id ? parseInt(v.id.substring(4)) : 0;
          $scope.nextVizId = $scope.nextVizId >= id ? $scope.nextVizId : id;
        });
        state.visualizations.forEach(function (v) {
          $scope.addVisualization(v.visualization.name, v);
        });
      }
    } else {
      var from = new Date();
      from.setDate(from.getDate() - 90); // 90 days back

      $scope.activeFilters = [
        angular.extend({
          from: from,
          to: new Date()
        }, possibleFilters.getPossibleFilters($scope.form.fields).visitDate)
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
    var id = options.id;
    if (!id) {
      id = 'viz-' + getNextVizId();

      angular.extend(options, {
        id: id // assign element a new id on insert to match the Fracas grid
      });
    }

    var viz = {
      sizeX: options.sizeX || DEFAULT_SIZE_X,
      sizeY: options.sizeY || DEFAULT_SIZE_Y,
      row: options.row,
      col: options.col,
      type: 'outpatient-visit',
      options: options,
      visualization: {
        name: name || 'table'
      },
      //pivotOptions: $scope.pivotOptions,
      pivot: options.pivot || {
        rows: [],
        cols: []
      }
    };
    $scope.visualizations.push(viz);
    updateURL.updateVisualization(options.id, viz);
  };

  $scope.removeVisualization = function (visualization) {
    updateURL.removeVisualization(visualization.options.id);
    var index = $scope.visualizations.indexOf(visualization);
    $scope.visualizations.splice(index, 1);
  };

  $scope.saveWorkbench = function () {
    var scopeJson = scopeToJson($scope);
    delete scopeJson.form;
    delete scopeJson.possibleFilters;
    delete scopeJson.pivotOptions;

    var state = {
      name: $scope.workbenchName || '',
      state: scopeJson
    };
    if ($scope.workbenchId) {
      Workbench.update(state, $scope.workbenchId);
    } else {
      Workbench.save(state);
    }

    // Store a copy of the original workbench definition because if user updates the workbench name via the
    // xeditable widget, we'll have to send the new workbench name and the original (last saved) workbench
    // definition to the server, which doesn't support updating just the name.
    angular.copy(scopeJson, $scope.originalWorkbench);
  };

  $scope.saveAsWorkbench = function () {
    var scopeJson = scopeToJson($scope);
    delete scopeJson.form;
    delete scopeJson.possibleFilters;
    delete scopeJson.pivotOptions;

    var state = {
      name: $scope.workbenchName || '',
      state: scopeJson
    };
    Workbench.save(state);
  };

  $scope.setNameFocus = function() {
    $scope.isWorkbenchNameFocused = true;
  }

  $scope.unsetNameFocus = function() {
    $scope.isWorkbenchNameFocused = false;
  }

  $scope.saveWorkbenchName = function() {
    if ($scope.workbenchId && $scope.originalWorkbench) {
      Workbench.updateName($scope.workbenchId, $scope.workbenchName, $scope.originalWorkbench);
    }
  }

  $scope.sortableOptions = {
    cursor: 'move',
    opacity: 0.9,
    handle: '.header'
  };
  $scope.$on('visualizationSelect', function (event, name, options) {
    $scope.addVisualization(name, options);
  });
};
