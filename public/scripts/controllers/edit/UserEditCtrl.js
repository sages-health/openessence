'use strict';

var angular = require('angular');
var controllers = require('../../modules').controllers;

var pluckName = function (r) {
  return r._source.name;
};

angular.module(controllers.name).controller('UserEditCtrl', function ($scope, $modal, tableUtil, crud, gettextCatalog, User, District) {
  $scope.filters = [
    {filterId: 'username'}
  ];
  $scope.filterTypes = [
    {
      filterId: 'username',
      type: 'text',
      field: 'username',
      name: gettextCatalog.getString('User Name')
    },
    {
      filterId: 'name',
      type: 'text',
      field: 'name',
      name: gettextCatalog.getString('Name')
    },
    {
      filterId: 'email',
      type: 'text',
      field: 'email',
      name: gettextCatalog.getString('Email')
    },
    {
      filterId: 'disabled',
      type: 'check-box',
      field: 'disabled',
      name: gettextCatalog.getString('Disabled')
    }
  ];

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

  $scope.changePasswordTemplate = require('../../../partials/edit/forms/change-password-form.html');
  $scope.editTemplate = require('../../../partials/edit/forms/user-form.html');
  $scope.deleteTemplate = require('../../../partials/delete-record.html');
  $scope.resource = User;
  var options = {
    sorting: {'username.raw': 'asc'},
    queryString: $scope.queryString
  };
  $scope.tableFilter = tableUtil.addFilter;
  $scope.tableParams = tableUtil.tableParams(options, User);

  var reload = function () {
    options.queryString = $scope.queryString;
    $scope.tableParams.reload();
  };

  var editOptions = {};
  // remove confirmPassword
  editOptions.dataCleanup = function (data) {
    var result = angular.copy(data);
    delete result.passwordConfirm;
    return result;
  };
  editOptions.roles = ['admin', 'data_entry', 'district_all'];
  editOptions.minPasswordLength = 4; // TODO don't use this on the client
  editOptions.isShort = function (field) {
    return field.$modelValue && field.$modelValue.length < $scope.minPasswordLength;
  };

  editOptions.passwordMatch = function (field1, field2) {
    return field1.$modelValue === field2.$modelValue;
  };
  var searchParams = {
    size: 100, // TODO search on demand if response indicates there are more records
    sort: 'name'
  };
  District.get(searchParams, function (response) {
    editOptions.districts = response.results.map(pluckName);
  });

  $scope.$watchCollection('queryString', reload);

  $scope.createRecord = function () {
    crud.open(null, $scope.resource, $scope.editTemplate, editOptions).result.then(reload);
  };

  $scope.editRecord = function (record) {
    crud.open(record, $scope.resource, $scope.editTemplate, editOptions).result.then(reload);
  };

  $scope.changePassword = function (record) {
    crud.open(record, $scope.resource, $scope.changePasswordTemplate, editOptions).result.then(reload);
  };

  $scope.deleteRecord = function (record) {
    crud.delete(record, $scope.resource, $scope.deleteTemplate).result.then(reload);
  };
});
