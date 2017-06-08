'use strict';

var angular = require('angular');

// @ngInject
module.exports = function ($scope, $modal, tableUtil, crud, $filter, UserResource, FormResource, $location) {
  $scope.activeFilters = [
    {
      filterID: 'username',
      type: 'text',
      field: 'username',
      name: $filter('i18next')('Username')
    }
  ];
  $scope.possibleFilters = [
    {
      filterID: 'username',
      type: 'text',
      field: 'username',
      name: $filter('i18next')('Username')
    },
    {
      filterID: 'name',
      type: 'text',
      field: 'name',
      name: $filter('i18next')('Name')
    },
    {
      filterID: 'email',
      type: 'text',
      field: 'email',
      name: $filter('i18next')('Email')
    },
    {
      filterID: 'disabled',
      type: 'check-box',
      field: 'disabled',
      name: $filter('i18next')('Disabled')
    }
  ].reduce(function (filters, filter) {
      filters[filter.filterID] = filter;
      return filters;
    }, {});

  $scope.autoRunQuery = true;

  $scope.changePasswordTemplate = require('../../../partials/edit/forms/change-password-form.html');
  $scope.editTemplate = require('../../../partials/edit/forms/user-form.html');
  $scope.deleteTemplate = require('../../../partials/delete-record.html');
  $scope.resource = UserResource;
  var options = {
    sorting: {'username.raw': 'asc'},
    queryString: $scope.queryString
  };
  $scope.tableFilter = tableUtil.addFilter;
  $scope.tableParams = tableUtil.tableParams(options, UserResource);

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
  editOptions.roles = ['admin', 'data_entry', 'all_locations', 'api_user'];
  editOptions.minPasswordLength = 4; // TODO don't use this on the client
  editOptions.isShort = function (field) {
    return field.$modelValue && field.$modelValue.length < $scope.minPasswordLength;
  };

  editOptions.passwordMatch = function (field1, field2) {
    return field1.$modelValue === field2.$modelValue;
  };
  FormResource.get({q: 'name:site', size: 1}, function (response) {
    if (response.results.length === 0) {
      console.error('No configured forms');
      $location.path('/edit/config');
      return;
    }

    var form = response.results[0]._source;
    var facilityField = form.fields.filter(function (fld) {
      return fld.name === 'medicalFacility';
    });
    editOptions.locations = (facilityField.length > 0 ? facilityField[0].values : []).map(function (obj) {
      return obj.name;
    });
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
};
