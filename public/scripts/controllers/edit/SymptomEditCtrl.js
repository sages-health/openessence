'use strict';

var angular = require('angular');
var controllers = require('../../modules').controllers;
var typeId = 'symptom';
var typeName = 'Symptom';

// The scope of this controller is defined in $scope.opts.scope
var RecordFormCtrl = function ($scope, $modalInstance, $http, gettext, gettextCatalog) {
  $scope.yellAtUser = false;
  $scope.namePlaceholder = gettextCatalog.getString(gettext(typeName + ' Name'));

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
    $http({
      method: 'POST',
      url: '/resources/' + typeId + ($scope.record.id ? ('/' + $scope.record.id) : ''),
      data: $scope.recordData
    }).success(function () {
      $scope.tableParams.reload();
      $scope.yellAtUser = false;
      $scope.success = true;
      $scope.cancel();
    }).error(function (data) {
      alert(gettextCatalog.getString(gettext(data.error || "Could not save record!")));
    });
  };
  $scope.cancel = function () {
    $modalInstance.close(0);
  };
};

RecordFormCtrl.$inject = ['$scope', '$modalInstance', '$http', 'gettext', 'gettextCatalog'];

angular.module(controllers.name).controller('SymptomEditCtrl', function ($scope, $http, gettext, gettextCatalog, orderByFilter, FrableParams, $rootScope, $modal) {
  // strings that we can't translate in the view, usually because they're in attributes
  $scope.strings = {
    edit: gettextCatalog.getString('Edit'),
    phoneId: gettextCatalog.getString('Phone ID'),
    name: gettextCatalog.getString('Name')
  };

  // default value for visit object and id
  $scope.recordData = {};
  $scope.record = {};

  $scope.createRecord = function () {
    $scope.action = gettextCatalog.getString('Create');
    $scope.recordData = {};
    $scope.record.id = 0;
    $scope.openDialog();
  };

  $scope.editRecord = function (id) {
    $http({
      method: 'GET',
      url: '/resources/' + typeId + '/' + id
    }).success(function (data) {
      $scope.action = gettextCatalog.getString('Edit');
      $scope.recordData = data.results[0]._source;
      $scope.record.id = data.results[0]._id;
      $scope.openDialog();
    });
  };

  $scope.deleteRecord = function (id) {
    $http({
      method: 'DELETE',
      url: '/resources/' + typeId + '/' + id
    }).success(function () {
      $scope.tableParams.reload();
    });
  };

  $scope.$watch('filter.value', function () {
    $scope.tableParams.reload();
  });

  $scope.tableParams = new FrableParams({
    page: 1,
    count: 10,
    sorting: {
      'name.raw': 'asc'
    }
  }, {
    total: function () {
      return $scope.total;
    },
    counts: [], // hide page count control
    $scope: {
      $data: {}
    },
    getData: function ($defer, params) {
      var append = '';
      if (params) {
        if ($scope.filter && $scope.filter.value) {
          // Wildcard search on all columns using lucene
          append = append + '&q=*' + $scope.filter.value + '*';
        }
        if (params.page()) {
          append = append + '&from=' + (params.page() - 1) * params.count();
        }
        if (params.count()) {
          append = append + '&size=' + params.count();
        }
        if (params.sorting()) {
          var sortParams = params.sorting();
          var res = '';
          for (var p in sortParams) {
            res = res + '&' + p + ':' + sortParams[p];
          }
          append = append + '&sort=' + res.substring(1);
        }
        append = append.substring(1);
      }
      $http.get('/resources/' + typeId + '?' + append).success(function (rawData) {
        // add id to data records
        var buildTableData = function () {
          return rawData.results
            .map(function (r) {
              var res = r._source;
              res.id = r._id;
              return res;
            });
        };

        var records = buildTableData();
        $scope.total = rawData.total;
        $defer.resolve(records);
      });
    }
  });

  $scope.opts = {
    backdrop: true,
    keyboard: true,
    backdropClick: true,
    scope: $scope,
    templateUrl: '/public/partials/edit/forms/' + typeId + '_form.html',
    controller: RecordFormCtrl
  };

  $scope.openDialog = function () {
    $modal.open($scope.opts);
  };
});
