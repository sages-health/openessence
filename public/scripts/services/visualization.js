'use strict';

var angular = require('angular');

// @ngInject
module.exports = function ($resource, $modal, $window, $location, VisualizationResource) {
  return {
    // TODO make clients use this directly
    resource: VisualizationResource,
    save: function (state1) {
      var state = angular.copy(state1);
      // Don't include es documents in our document. Elasticsearch throws a nasty exception if you do.
      ['data', 'crosstabData', 'strings'].forEach(function (k) {
        delete state[k];
      });
      state.filters.map(function(v){
        delete v.values;
        return v;
      });
      if (state.form) {
        state.form.fields.map(function (v) {
          delete v.values;
          return v;
        });
      }

      if (state.tableParams) {
        delete state.tableParams.data;
      }

      $modal.open({
        template: require('../../partials/save-visualization-modal.html'),
        controller: ['$scope', '$modalInstance', function ($scope, $modalInstance) {
          $scope.viz = {};
          $scope.save = function (form) {
            if (form.$invalid) {
              $scope.yellAtUser = true;
              return;
            }

            $modalInstance.close($scope.viz.name);
          };

          $scope.cancel = function () {
            $modalInstance.dismiss('cancel');
          };
        }]
      })
        .result
        .then(function (name) {
          new VisualizationResource({
            name: name,
            state: state
          })
            .$save();
        });
    },
    export: function (state) {
      $window.state = angular.copy({
        visualization: state.visualization,
        queryString: state.queryString,
        filters: state.filters,
        pivot: state.pivot,
        options: state.options,
        form: state.form
      });
      //TODO quick fix for url length, need to handle state/URL/viz better
      $window.state.filters.map(function(v){
        delete v.values;
        return v;
      });
      if ($window.state.form) {
        $window.state.form.fields.map(function (v) {
          delete v.values;
          return v;
        });
      }
      //var url = $window.location.protocol + '//' + $window.location.host + $window.location.pathname;
      var url = document.baseURI;
      url = url + 'visualization-export';

      $window.open(url, 'visualizationExport', 'width=1200,resizable=1,scrollbars=1,toolbar=0,location=0,menubar=0,titlebar=0');
    }
  };
};
