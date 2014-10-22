'use strict';

// @ngInject
module.exports = function ($scope, crud, tableUtil, gettextCatalog, DispositionResource) {
  $scope.filters = [
    {filterID: 'name'}
  ];
  $scope.filterTypes = [
    {
      filterID: 'name',
      type: 'text',
      field: 'name',
      name: gettextCatalog.getString('Name')
    },
    {
      filterID: 'phoneId',
      type: 'text',
      field: 'phoneId',
      name: gettextCatalog.getString('Phone ID')
    }
  ];

  // strings that we can't translate in the view, usually because they're in attributes
  $scope.strings = {
    disposition: gettextCatalog.getString('Disposition'),
    newDisposition: gettextCatalog.getString('New disposition'),
    edit: gettextCatalog.getString('Edit'),
    phoneId: gettextCatalog.getString('Phone ID'),
    name: gettextCatalog.getString('Name')
  };

  $scope.editTemplate = require('../../../partials/edit/forms/disposition-form.html');
  $scope.deleteTemplate = require('../../../partials/delete-record.html');
  $scope.resource = DispositionResource;
  var options = {
    sorting: {'name.raw': 'asc'},
    queryString : $scope.queryString
  };

  // ---------------- Start: Common functions
  $scope.tableFilter = tableUtil.addFilter;
  $scope.tableParams = tableUtil.tableParams(options, $scope.resource);
  var reload = function (){
    options.queryString = $scope.queryString;
    $scope.tableParams.reload();
  };

  $scope.$watchCollection('queryString', reload);
  $scope.createRecord = function () {
    crud.open(null, $scope.resource, $scope.editTemplate).result.then(reload);
  };
  $scope.editRecord = function (record) {
    crud.open(record, $scope.resource, $scope.editTemplate).result.then(reload);
  };
  $scope.deleteRecord = function (record) {
    crud.delete(record, $scope.resource, $scope.deleteTemplate).result.then(reload);
  };
  // ---------------- End: Common functions
};
