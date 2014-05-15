'use strict';

var angular = require('angular');
var controllers = require('../../modules').controllers;

angular.module(controllers.name).controller('DistrictEditCtrl', function ($scope, $modal, orderByFilter, gettextCatalog,
                                                                          FrableParams, District, sortString) {
  $scope.filters = [
    {type: 'name'}
  ];
  $scope.filterTypes = [ // TODO let outpatient/filters define this
    {
      type: 'name',
      name: gettextCatalog.getString('Name')
    },
    {
      type: 'phoneid',
      name: gettextCatalog.getString('Phone ID')
    }
  ];
  $scope.$watchCollection('queryString', function () {
    $scope.tableParams.reload();
  });

  $scope.errorOnRecordSave = '';

  // strings that we can't translate in the view, usually because they're in attributes
  $scope.strings = {
    district: gettextCatalog.getString('District'),
    newDistrict: gettextCatalog.getString('New district'),
    edit: gettextCatalog.getString('Edit'),
    phoneId: gettextCatalog.getString('Phone ID'),
    name: gettextCatalog.getString('Name')
  };

  $scope.tableParams = new FrableParams({
    page: 1,
    count: 10,
    sorting: {
      'name.raw' : 'asc'
    }
  }, {
    total: 0,
    counts: [], // hide page count control
    $scope: {
      $data: {}
    },
    getData: function ($defer, params) {
      if (!angular.isDefined($scope.queryString)) {
        // Wait for queryString to be set before we accidentally fetch a bajillion rows we don't need.
        // If you really don't want a filter, set queryString='' or null
        // TODO there's probably a more Angular-y way to do this
        $defer.resolve([]);
        return;
      }

      District.get({
        q: $scope.queryString,
        from: (params.page() - 1) * params.count(),
        size: params.count(),
        sort: sortString.toElasticsearchString(params.orderBy()[0]) // we only support one level of sorting
      }, function (data) {
        params.total(data.total);
        $defer.resolve(data.results);
      });
    }
  });

  var reload = function () {
    $scope.tableParams.reload();
  };

  var openDialog = function (record) {
    return $modal.open({
      template: require('../../../partials/edit/forms/district-form.html'),
      controller: ['$scope', '$modalInstance', function ($scope, $modalInstance) {
        $scope.record = record || {};
        $scope.district = angular.copy($scope.record._source) || {};
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
            if (data.data && data.data.error && data.data.error.name === 'UniqueConstraintViolationError') {
              $scope.errorOnRecordSave = data.data.error.name;
            }
          };

          if ($scope.record._id || $scope.record._id === 0) { // TODO move this logic to resource
            District.update(angular.extend({_id: $scope.record._id}, $scope.district), function () {
              cleanup();
            }, function (data) {
              showError(data);
            });
          } else {
            District.save($scope.district, function () {
              cleanup();
            }, function (data) {
              showError(data);
            });
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
        $scope.record = record;
        $scope.delete = function () {
          District.remove({_id: record._id}, function () {
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
});
