'use strict';

var angular = require('angular');
var controllers = require('../../modules').controllers;

angular.module(controllers.name).controller('DashboardEditCtrl', function ($scope, $modal, tableUtil, crud, gettextCatalog, DashboardResource) {
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
      filterId: 'description',
      type: 'text',
      field: 'description',
      name: gettextCatalog.getString('Description')
    }
  ];
  // strings that we can't translate in the view, usually because they're in attributes
  $scope.strings = {
    edit: gettextCatalog.getString('Edit'),
    dashboards: gettextCatalog.getString('Dashboards'),
    name: gettextCatalog.getString('Name'),
    newDashboard: gettextCatalog.getString('New Dashboard'),
    description: gettextCatalog.getString('Description')
  };

  $scope.editTemplate = require('../../../partials/edit/forms/dashboard-form.html');
  $scope.deleteTemplate = require('../../../partials/delete-record.html');
  $scope.resource = DashboardResource;
  var options = {
    sorting: {'name': 'asc'},
    queryString: $scope.queryString
  };
  $scope.tableFilter = tableUtil.addFilter;
  $scope.tableParams = tableUtil.tableParams(options, DashboardResource);

  var reload = function () {
    options.queryString = $scope.queryString;
    $scope.tableParams.reload();
  };

  var editOptions = {};
  $scope.$watchCollection('queryString', reload);

  // User cannot create dashboard from Manage dashboard page
  //  $scope.createRecord = function () {
  //    crud.open(null, $scope.resource, $scope.editTemplate, editOptions).result.then(reload);
  //  };

  $scope.editRecord = function (record) {
    crud.open(record, $scope.resource, $scope.editTemplate, editOptions).result.then(reload);
  };

  $scope.changePassword = function (record) {
    crud.open(record, $scope.resource, $scope.changePasswordTemplate, editOptions).result.then(reload);
  };

  $scope.deleteRecord = function (record) {
    var deleteRecord = angular.copy(record);
    delete deleteRecord._source.widgets;
    crud.delete(deleteRecord, $scope.resource, $scope.deleteTemplate).result.then(reload);
  };
});
