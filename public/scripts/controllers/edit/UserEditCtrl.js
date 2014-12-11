'use strict';

var angular = require('angular');

// @ngInject
module.exports = function ($scope, $modal, tableUtil, crud, gettextCatalog, UserResource, FacilityResource) {
  $scope.activeFilters = [
    {
      filterID: 'username',
      type: 'text',
      field: 'username',
      name: gettextCatalog.getString('Username')
    }
  ];
  $scope.possibleFilters = [
    {
      filterID: 'username',
      type: 'text',
      field: 'username',
      name: gettextCatalog.getString('Username')
    },
    {
      filterID: 'name',
      type: 'text',
      field: 'name',
      name: gettextCatalog.getString('Name')
    },
    {
      filterID: 'email',
      type: 'text',
      field: 'email',
      name: gettextCatalog.getString('Email')
    },
    {
      filterID: 'disabled',
      type: 'check-box',
      field: 'disabled',
      name: gettextCatalog.getString('Disabled')
    }
  ].reduce(function (filters, filter) {
      filters[filter.filterID] = filter;
      return filters;
    }, {});

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
    sort: 'name.raw'
  };
  FacilityResource.get(searchParams, function (response) {
    var districts = response.results.map(function (r) {
      return r._source.location.district;
    });
    editOptions.medicalFacility = {
      location: {
        districts: districts
      }
    };
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
