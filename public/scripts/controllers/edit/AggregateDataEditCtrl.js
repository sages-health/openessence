'use strict';

var angular = require('angular');
var moment = require('moment');

// @ngInject
module.exports = function ($scope, crud, tableUtil, gettextCatalog, OutpatientVisitResource, DistrictResource,
                           SymptomResource, outpatientUploadModal, outpatientImportModal) {

  $scope.getWeek = function (date) {
    return moment(date).format('W');
  };
  $scope.getYear = function (date) {
    return moment(date).format('GGGG');
  };

  $scope.printAggregate = function (field, includeCount) {
    var print = [];
    if (field) {
      field.map(function (val) {
        print.push(val.name + (includeCount ? ('(' + val.count + ')') : ''));
      });
    }
    return print.join(',');
  };

  $scope.upload = function () {
    outpatientUploadModal.open().result
      .then(function () {
        reload();
      });
  };

  $scope.filters = [
    {filterId: 'date'}
  ];

  $scope.filterTypes = [
    {
      filterId: 'date',
      type: 'date-range',
      field: 'visitDate',
      name: gettextCatalog.getString('Visit date')
    },
    {
      filterId: 'districts',
      type: 'multi-select',
      field: 'district',
      store: {
        resource: DistrictResource,
        field: 'name'
      },
      name: gettextCatalog.getString('District')
    },
    {
      filterId: 'symptoms',
      type: 'multi-select',
      field: 'symptoms.name',
      store: {
        resource: SymptomResource,
        field: 'name'
      },
      name: gettextCatalog.getString('Symptoms')
    }
  ];

  // strings that we can't translate in the view, usually because they're in attributes
  $scope.strings = {
    aggregateData: gettextCatalog.getString('Aggregate Data'),
    newAggregateData: gettextCatalog.getString('New'),
    import: gettextCatalog.getString('Import'),
    upload: gettextCatalog.getString('Upload'),
    edit: gettextCatalog.getString('Edit'),
    visitDate: gettextCatalog.getString('Date'),
    week: gettextCatalog.getString('Week'),
    year: gettextCatalog.getString('Year'),
    district: gettextCatalog.getString('District'),
    sitesTotal: gettextCatalog.getString('Total Sites'),
    sitesReporting: gettextCatalog.getString('Number of Sites Reporting'),
    symptoms: gettextCatalog.getString('Symptoms'),
    count: gettextCatalog.getString('Count'),
    symptomName: gettextCatalog.getString('Symptom Name'),
    acuteFeverAndRash: gettextCatalog.getString('Acute Fever and Rash'),
    diarrhoea: gettextCatalog.getString('Diarrhoea'),
    influenzaLikeIllness: gettextCatalog.getString('Influenza-like Illness'),
    prolongedFever: gettextCatalog.getString('Prolonged Fever')
  };
  $scope.editTemplate = require('../../../partials/edit/forms/aggregate-data-form.html');
  $scope.deleteTemplate = require('../../../partials/delete-record.html');
  $scope.resource = OutpatientVisitResource;

  var options = {
    sorting: {'visitDate': 'asc'},
    queryString: $scope.queryString
  };

  $scope.tableFilter = tableUtil.addFilter;
  $scope.tableParams = tableUtil.tableParams(options, $scope.resource);
  var reload = function () {
    options.queryString = $scope.queryString;
    $scope.tableParams.reload();
  };
  $scope.$watchCollection('queryString', reload);

  var pluckName = function (r) {
    return r._source.name;
  };

  var gridOptions = {
    data: 'data.symptoms',
    enableRowSelection: false,
    enableCellSelection: true,
    enableCellEditOnFocus: true,
    columnDefs: [
      {field: 'name', displayName: $scope.strings.symptomName, cellEditableCondition: 'false'},
      {field: 'count', displayName: $scope.strings.count}
    ]
  };

  var allSymptoms = [$scope.strings.acuteFeverAndRash, $scope.strings.diarrhoea, $scope.strings.influenzaLikeIllness,
                     $scope.strings.prolongedFever];
  var defaultSymptoms = allSymptoms.map(function (el) {
    return {name: el};
  });

  var addDefaultSymptoms = function (symptoms, allSymptoms) {
    symptoms = symptoms ? symptoms : [];
    allSymptoms.forEach(function (el) {
      var found = symptoms.filter(function (a) {
        return a.name === el;
      });

      if (found.length === 0) {
        symptoms.push({name: el});
      }
    });
    return symptoms;
  };

  var dataCleanup = function (data) {
    // only store symptoms having count value
    data.symptoms = data.symptoms.filter(function (el) {
      return el.count !== '' && !isNaN(el.count);
    });
    data.symptoms.forEach(function (e) {
      e.count = parseInt(e.count, 0);
    });
    return data;
  };

  // default scope params for edit/create modal
  var modalScopeOptions = {
    gridOptions: gridOptions,
    dataCleanup: dataCleanup,
    page: 2,
    allowUpload: false
  };

  $scope.createRecord = function () {
    var scopeOptions = angular.copy(modalScopeOptions);
    var record = {
      _source: {
        symptoms: angular.copy(defaultSymptoms)
      }
    };
    DistrictResource.get({size: 100, sort: 'name'}, function (response) {
      scopeOptions.districts = response.results.map(pluckName);
      crud.open(record, $scope.resource, $scope.editTemplate, scopeOptions).result.then(reload);
    });
  };

  $scope.editRecord = function (rec) {
    var record = angular.copy(rec);
    record._source.symptoms = addDefaultSymptoms(record._source.symptoms, allSymptoms);

    var scopeOptions = angular.copy(modalScopeOptions);
    DistrictResource.get({size: 100, sort: 'name'}, function (response) {
      scopeOptions.districts = response.results.map(pluckName);
      if (record.district && scopeOptions.districts.indexOf(record.district) === -1) {
        scopeOptions.districts.push(record.district);
      }
      crud.open(record, $scope.resource, $scope.editTemplate, scopeOptions).result.then(reload);
    });
  };

  $scope.deleteRecord = function (record) {
    crud.delete(record, $scope.resource, $scope.deleteTemplate).result.then(reload);
  };

  $scope.importRecord = function () {
    var scopeOptions = {
      gridOptions: gridOptions,
      dataCleanup: dataCleanup
    };
    var record = {
      _source: {
        symptoms: angular.copy(defaultSymptoms)
      }
    };
    DistrictResource.get({size: 100, sort: 'name'}, function (response) {
      scopeOptions.districts = response.results.map(pluckName);
      outpatientImportModal.open(record, $scope.resource, $scope.editTemplate, scopeOptions).result.then(reload);
    });
  };
};
