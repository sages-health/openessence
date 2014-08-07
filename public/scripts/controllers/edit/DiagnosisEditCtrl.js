'use strict';

var angular = require('angular');
var controllers = require('../../modules').controllers;

angular.module(controllers.name).controller('DiagnosisEditCtrl', function ($scope, $modal, crud, tableUtil,
                                                                           gettextCatalog, sortString, FrableParams,
                                                                           Diagnosis) {
  $scope.filters = [
    {filterId: 'name'}
  ];
  $scope.filterTypes = [
    {
      filterId: 'name',
      type: 'text',
      field: 'name',
      name: gettextCatalog.getString('Name')
    }
  ];

  $scope.strings = {
    diagnosis: gettextCatalog.getString('Diagnosis'),
    newDiagnosis: gettextCatalog.getString('New diagnosis'),
    enabled: gettextCatalog.getString('Enabled?'),
    name: gettextCatalog.getString('Name'),
    delete: gettextCatalog.getString('Delete')
  };

  $scope.diagnoses = {};
  $scope.toggleEnabled = function (diagnosisName) {
    var diagnosis = $scope.diagnoses[diagnosisName];
    Diagnosis.update({_id: diagnosis._id, version: diagnosis._version}, diagnosis._source, function (response) {
      // update version so user can edit again
      diagnosis._version = response._version;
    });
    // TODO handle errors
  };

  $scope.tableParams = new FrableParams({
    page: 1,
    count: 10,
    sorting: {'name.raw': 'asc'}
  }, {
    total: 0,
    counts: [], // hide page count control
    $scope: {
      $data: {}
    },
    getData: function ($defer, params) {
      if (!angular.isDefined($scope.queryString)) {
        $defer.resolve([]);
        return;
      }

      Diagnosis.get({
        q: $scope.queryString,
        from: (params.page() - 1) * params.count(),
        size: params.count(),
        sort: sortString.toElasticsearchString(params.orderBy()[0])
      }, function (response) {
        params.total(response.total);

        response.results.forEach(function (r) {
          $scope.diagnoses[r._source.name] = r;
        });

        $defer.resolve(response.results);
      });
    }
  });

  var reload = function () {
    $scope.tableParams.reload();
  };

  $scope.$watch('queryString', reload);
  $scope.createRecord = function () {
    crud.open(null, Diagnosis, require('../../../partials/edit/forms/diagnosis-form.html')).result.then(reload);
  };

  $scope.deleteRecord = function (record) {
    $modal.open({
      template: require('../../../partials/delete-diagnosis-modal.html'),
      controller: ['$scope', '$modalInstance', function ($scope, $modalInstance) {
        $scope.diagnosis  = record._source.name;
        $scope['delete'] = function () {
          Diagnosis.remove({_id: record._id}, function () {
            $modalInstance.close(record);
          });
        };
        $scope.cancel = function () {
          $modalInstance.dismiss('cancel');
        };
      }]
    }).result.then(reload);
  };
});
