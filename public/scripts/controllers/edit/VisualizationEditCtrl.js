'use strict';

var angular = require('angular');

// @ngInject
module.exports = function ($scope, $modal, $q, orderByFilter, $filter, NgTableParams, VisualizationResource,
                           sortString) {

  $scope.checkboxes = {items: []};

  $scope.printMe = function(){
    console.log('stuff:' + $scope.checkboxes);
  };
  $scope.activeFilters = [
    //{type: 'name'} // no need right now
  ];
  $scope.possibleFilters = [
    {
      filterID: 'name',
      type: 'text',
      field: 'name',
      name: $filter('i18next')('Name')
    },
    {
      filterID: 'type',
      type: 'text',
      field: 'visualization.name',
      name: $filter('i18next')('Type')
    }
  ].reduce(function (filters, filter) {
      filters[filter.filterID] = filter;
      return filters;
    }, {});
  $scope.$watchCollection('queryString', function () {
    $scope.tableParams.reload();
  });

  $scope.errorOnRecordSave = '';

  $scope.tableParams = new NgTableParams({
    page: 1,
    count: 10,
    sorting: {
      'name' : 'asc'
    }
  }, {
    total: 0,
    counts: [], // hide page count control
    $scope: {
      $data: {}
    },
    getData: function (params) {
      if (!angular.isDefined($scope.queryString)) {
        // Wait for queryString to be set before we accidentally fetch a bajillion rows we don't need.
        // If you really don't want a filter, set queryString='' or null
        // TODO there's probably a more Angular-y way to do this
        return [];
        return;
      }

      var promise = queryForData(params);

      var results = promise.$promise.then(function(data){
        return data.results;
      });
      return results;

    }

  });

  var queryForData = function(params){
      var promise = VisualizationResource.get({
        q: $scope.queryString,
        from: (params.page() - 1) * params.count(),
        size: params.count(),
        sort: sortString.toElasticsearchString(params.orderBy()[0]) // we only support one level of sorting
      }, function (data) {
        params.total(data.total);
        return data.results;
      });

      return promise;
    };

  var reload = function () {
    $scope.tableParams.reload();
  };

  var openDialog = function (record) {
    return $modal.open({
      template: require('../../../partials/edit/forms/visualization-form.html'),
      controller: ['$scope', '$modalInstance', function ($scope, $modalInstance) {
        $scope.record = record || {};
        $scope.visualization = angular.copy($scope.record._source) || {};
        $scope.yellAtUser = false;

        $scope.isInvalid = function (field) {
          if ($scope.yellAtUser) {
            // if the user has already tried to submit, show them all the fields they're required to submit
            return field.$invalid;
          } else {
            // only show a field's error message if the user has already interacted with it, this prevents a ton of red
            // before the user has even interacted with the form
            return field.$invalid && !field.$pristine;
          }
        };

        $scope.submit = function (form) {
          if (form.$invalid) {
            $scope.yellAtUser = true;
            return;
          }

          var cleanup = function () {
            $scope.yellAtUser = false;
            $scope.success = true;
            $modalInstance.close();
          };

          var showError = function (data) {
            if (data.status === 409) {
              // Get latest record data and update form
              VisualizationResource.get({id: $scope.record._id}, function (newData) {
                $scope.conflictError = true;
                $scope.record = newData;
                $scope.visualization = newData._source;
              });
            } else if (data.data && data.data.error && data.data.error.name === 'UniqueConstraintViolationError') {
              $scope.errorOnRecordSave = data.data.error.name;
            }
          };

          if ($scope.record._id || $scope.record._id === 0) { // TODO move this logic to resource
            VisualizationResource.update(angular.extend({
                id: $scope.record._id,
                version: $scope.record._version
              }, $scope.visualization), cleanup, showError);
          } else {
            VisualizationResource.save($scope.visualization, cleanup, showError);
          }

        };

        $scope.cancel = function () {
          $modalInstance.dismiss('cancel');
        };
      }]
    });
  };

  $scope.createRecord = function () {
    openDialog().result.then(function () {
      reload();
    });
  };

  $scope.editRecord = function (record) {
    openDialog(record).result.then(function () {
      reload();
    });
  };

  $scope.deleteRecord = function (record) {
    $modal.open({
      template: require('../../../partials/delete-record.html'),
      controller: ['$scope', '$modalInstance', function ($scope, $modalInstance) {
        $scope.record = angular.copy(record);
        delete $scope.record._source.state;
        $scope.delete = function () {
          VisualizationResource.remove({id: record._id}, function () {
            $modalInstance.close(record);
          });
        };
        $scope.cancel = function () {
          $modalInstance.dismiss('cancel');
        };
      }]
    }).result
      .then(function () {
        reload();
      });
  };
};
