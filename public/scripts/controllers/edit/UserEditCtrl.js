'use strict';

var angular = require('angular');
var controllers = require('../../modules').controllers;

var pluckName = function (r) {
  return r._source.name;
};

angular.module(controllers.name).controller('UserEditCtrl', function ($scope, $modal, orderByFilter, gettextCatalog,
                                                                      FrableParams, User, sortString, District) {
  $scope.errorOnRecordSave = '';

  // strings that we can't translate in the view, usually because they're in attributes
  $scope.strings = {
    users: gettextCatalog.getString('Users'),
    newUser: gettextCatalog.getString('New user'),
    edit: gettextCatalog.getString('Edit'),
    username: gettextCatalog.getString('User Name'),
    email: gettextCatalog.getString('Email'),
    name: gettextCatalog.getString('Name'),
    disabled: gettextCatalog.getString('Disabled'),
    roles: gettextCatalog.getString('Roles'),
    changePasswordTitle: gettextCatalog.getString('Change Password'),
    updateAccessTitle: gettextCatalog.getString('Update User Access'),
    editUserTitle: gettextCatalog.getString('Edit User'),
    deleteUserTitle: gettextCatalog.getString('Delete User')
  };

  $scope.tableParams = new FrableParams({
    page: 1,
    count: 10,
    sorting: {
      'username.raw': 'asc'
    }
  }, {
    total: 0,
    counts: [], // hide page count control
    $scope: {
      $data: {}
    },
    getData: function ($defer, params) {
      User.get({
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

  var openDialog = function (url, record) {

    return $modal.open({
      template: url,
      controller: ['$scope', '$modalInstance', function ($scope, $modalInstance) {
        $scope.record = record || {};
        $scope.user = angular.copy($scope.record._source) || {};
        $scope.yellAtUser = false;
        $scope.minPasswordLength = 4;
        $scope.rolePlaceholder = gettextCatalog.getString('Please select user role(s)');
        $scope.districtPlaceholder = gettextCatalog.getString('Please select district(s)');
        $scope.roles = ['Admin', 'DataEntry', 'AllDistricts'];
        $scope.isShort = function (field) {
          return field.$modelValue && field.$modelValue.length < $scope.minPasswordLength;
        };

        $scope.passwordMatch = function (field1, field2) {
          return field1.$modelValue === field2.$modelValue;
        };

        var searchParams = {
          size: 100, // TODO search on demand if response indicates there are more records
          sort: 'name'
        };
        District.get(searchParams, function (response) {
          $scope.districts = response.results.map(pluckName);
        });

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

          var data = angular.copy($scope.user);
          if (data.passwordConfirm) {
            delete data.passwordConfirm;
          }

          if ($scope.record._id || $scope.record._id === 0) { // TODO move this logic to resource
            User.update(angular.extend({_id: $scope.record._id}, data), function () {
              cleanup();
            }, function (data) {
              showError(data);
            });
          } else {
            User.save(data, function () {
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
    var url = require('../../../partials/edit/forms/user-form.html');
    openDialog(url).result.then(function () {
      reload();
    });
  };

  $scope.editRecord = function (record) {
    var url = require('../../../partials/edit/forms/user-form.html');
    openDialog(url, record).result.then(function () {
      reload();
    });
  };

  $scope.changePassword = function (record) {
    var url = require('../../../partials/edit/forms/change-password-form.html');
    openDialog(url, record).result.then(function () {
      reload();
    });
  };

  $scope.deleteRecord = function (record) {
    var data = angular.copy(record);

    $modal.open({
      template: require('../../../partials/delete-record.html'),
      controller: ['$scope', '$modalInstance', function ($scope, $modalInstance) {
        $scope.record = data;
        $scope.delete = function () {
          User.remove({_id: data._id}, function () {
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
