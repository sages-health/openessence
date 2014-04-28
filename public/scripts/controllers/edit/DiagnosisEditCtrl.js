'use strict';

var angular = require('angular');
var controllers = require('../../modules').controllers;

angular.module(controllers.name).controller('DiagnosisEditCtrl', function ($scope, $modal, orderByFilter,
                                                                           gettextCatalog, FrableParams, Diagnosis,
                                                                           sortString) {

  // strings that we can't translate in the view, usually because they're in attributes
  $scope.strings = {
    diagnosis: gettextCatalog.getString('Diagnosis'),
    newDiagnosis: gettextCatalog.getString('New diagnosis'),
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
      Diagnosis.get({
//          q: scope.queryString,
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
      template: require('../../../partials/edit/forms/diagnosis-form.html'),
      controller: ['$scope', '$modalInstance', function ($scope, $modalInstance) {
        $scope.record = record || {};
        $scope.diagnosis = angular.copy($scope.record._source) || {};
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

          if ($scope.record._id || $scope.record._id === 0) { // TODO move this logic to resource
            Diagnosis.update(angular.extend({_id: $scope.record._id}, $scope.diagnosis), function () {
              cleanup();
            }); // TODO handle error
          } else {
            Diagnosis.save($scope.diagnosis, function () {
              cleanup();
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
          Diagnosis.remove({_id: record._id}, function () {
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
