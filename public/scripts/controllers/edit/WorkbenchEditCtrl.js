'use strict';

var angular = require('angular');

// @ngInject
module.exports = function ($scope, $modal, tableUtil, crud, $rootScope, $filter, WorkbenchResource) {
  $scope.activeFilters = [
    {
      filterID: 'name',
      type: 'text',
      field: 'name',
      name: $filter('i18next')('Name')
    }
  ];
  $scope.possibleFilters = [
    {
      filterID: 'name',
      type: 'text',
      field: 'name',
      name: $filter('i18next')('Name')
    },
    {
      filterID: 'description',
      type: 'text',
      field: 'description',
      name: $filter('i18next')('Description')
    }
  ];

  var editTemplate = require('../../../partials/edit/forms/workbench-form.html');
  $scope.deleteTemplate = require('../../../partials/delete-record.html');
  $scope.resource = WorkbenchResource;
  var options = {
    sorting: {'name': 'asc'},
    queryString: $scope.queryString
  };
  $scope.tableParams = tableUtil.tableParams(options, WorkbenchResource);

  var reload = function () {
    options.queryString = $scope.queryString;
    $scope.tableParams.reload();
  };

  var editOptions = {};
  $scope.$watchCollection('queryString', reload);

  var workbenchChanged = function () {
    $rootScope.$emit('workbenchEdit');
  };

  $scope.editRecord = function (record) {
    crud.open(record, $scope.resource, editTemplate, editOptions).result.then(reload).then(workbenchChanged);
  };

  $scope.deleteRecord = function (record) {
    var deleteRecord = angular.copy(record);
    delete deleteRecord._source.state;
    crud.delete(deleteRecord, $scope.resource, $scope.deleteTemplate).result.then(reload).then(workbenchChanged);
  };
};
