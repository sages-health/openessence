'use strict';

var angular = require('angular');
var controllers = require('../../modules').controllers;

angular.module(controllers.name).controller('DischargeEditCtrl', function ($scope, $modal, orderByFilter, gettextCatalog,
                                                                           FrableParams, Discharge, sortString, $rootScope) {
  $scope.filters = [
    {filterId: 'name'}
  ];
  $scope.filterTypes = [
    {
      filterId: 'name',
      type: 'text',
      field: 'name',
      name: gettextCatalog.getString('Name')
    },
    {
      filterId: 'phoneId',
      type: 'text',
      field: 'phoneId',
      name: gettextCatalog.getString('Phone ID')
    }
  ];
  $scope.$watchCollection('queryString', function () {
    $scope.tableParams.reload();
  });
  $scope.tableFilter = function (field, value) {
    //TODO multiselect if value.length > ?
    if (value || value === false) {
      var a = [].concat(value);
      a.forEach(function (v) {
        var filter = {
          filterId: field,
          value: v
        };
        $rootScope.$emit('filterChange', filter, true, false);
      });
    }
  };

  $scope.errorOnRecordSave = {};

  // strings that we can't translate in the view, usually because they're in attributes
  $scope.strings = {
    discharge: gettextCatalog.getString('Discharge'),
    newDischarge: gettextCatalog.getString('New discharge'),
    edit: gettextCatalog.getString('Edit'),
    phoneId: gettextCatalog.getString('Phone ID'),
    name: gettextCatalog.getString('Name')
  };

  $scope.tableParams = new FrableParams({
    page: 1,
    count: 10,
    sorting: {
      'name.raw': 'asc'
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

      Discharge.get({
        q: $scope.queryString,
        from: (params.page() - 1) * params.count(),
        size: params.count(),
        sort: sortString.toElasticsearchString(params.orderBy()[0]) // we only support one level of sorting
      }, function (data) {
        params.total(data.total);
        $defer.resolve(data.results);
      }, function error (response) {
        $rootScope.$broadcast('filterError', response);
      });
    }
  });

  var reload = function () {
    $scope.tableParams.reload();
  };

  var openDialog = function (record) {
    return $modal.open({
      template: require('../../../partials/edit/forms/discharge-form.html'),
      controller: ['$scope', '$modalInstance', function ($scope, $modalInstance) {
        $scope.record = record || {};
        $scope.discharge = angular.copy($scope.record._source) || {};
        $scope.yellAtUser = false;

        $scope.isInvalid = function (field) { // TODO move to parent controller
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

          var showError = function (response) {
            if (response.status === 409) {
              // Get latest record data and update form
              Discharge.get({_id: $scope.record._id}, function (newData) {
                $scope.conflictError = true;
                $scope.record = newData;
                $scope.discharge = newData._source;
              });
            } else if (response.data.error === 'UniqueConstraintViolation') {
              $scope.errorOnRecordSave = response.data;
            }
          };

          if ($scope.record._id || $scope.record._id === 0) { // TODO move this logic to resource
            Discharge.update({
              _id: $scope.record._id,
              version: $scope.record._version
            }, $scope.discharge, cleanup, showError);
          } else {
            Discharge.save($scope.discharge, cleanup, showError);
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
          Discharge.remove({_id: record._id}, function () {
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