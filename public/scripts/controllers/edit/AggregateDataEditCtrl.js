'use strict';

var angular = require('angular');
var moment = require('moment');

// @ngInject
module.exports = function ($scope, crud, tableUtil, gettextCatalog, OutpatientVisitResource, DistrictResource, SymptomResource, outpatientUploadModal, outpatientImportModal, possibleFilters, FormResource) {

  FormResource.get({size: 1, q: 'name:demo'}, function (response) {
    if (response.results.length === 0) {
      throw new Error('No configured forms');
    }

    var form = response.results[0]._source;
    $scope.form = form; // need to pass to visualizations

    $scope.possibleFilters = form.fields.reduce(function (filters, field) {
      if (!field.enabled) {
        return filters;
      }

      var possibleFilter = possibleFilters[field.name];
      if (possibleFilter) {
        filters[field.name] = angular.extend({values: field.values}, possibleFilters[field.name]);
      }

      $scope.editTemplate = require('../../../partials/edit/forms/aggregate-data-form.html');
      $scope.deleteTemplate = require('../../../partials/delete-record.html');
      $scope.resource = OutpatientVisitResource;
      return filters;
    }, {});

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

    $scope.allSymptoms = $scope.possibleFilters.symptoms ? $scope.possibleFilters.symptoms.values.map(function (v) {
      return {name: v.name};
    }) : [];

    $scope.allDistricts = $scope.possibleFilters['medicalFacility.location.district'] ? $scope.possibleFilters['medicalFacility.location.district'].values.map(function (v) {
      return v.name;
    }) : [];


    $scope.activeFilters = [
      angular.extend({
        filterID: 'visitDate'
        // no to/from window, we page the results anyway
      }, possibleFilters.visitDate)
    ];

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

    var addDefaultSymptoms = function (symptoms, allSymptoms) {
      symptoms = symptoms ? symptoms : [];
      allSymptoms.forEach(function (el) {
        var found = symptoms.filter(function (a) {
          return a.name === el.name;
        });

        if (found.length === 0) {
          symptoms.push({name: el.name});
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
      allowUpload: false,
      districts: $scope.allDistricts,
      symptoms: $scope.allSymptoms
    };

    $scope.createRecord = function () {
      var record = {
        _source: {
          symptoms: angular.copy($scope.allSymptoms)
        }
      };
      crud.open(record, $scope.resource, $scope.editTemplate, angular.copy(modalScopeOptions)).result.then(reload);
    };

    $scope.editRecord = function (rec) {
      var record = angular.copy(rec);
      record._source.symptoms = addDefaultSymptoms(record._source.symptoms, $scope.allSymptoms);
      crud.open(record, $scope.resource, $scope.editTemplate, angular.copy(modalScopeOptions)).result.then(reload);
    };

    $scope.deleteRecord = function (record) {
      crud.delete(record, $scope.resource, $scope.deleteTemplate).result.then(reload);
    };

    $scope.importRecord = function () {
      var record = {
        _source: {
          symptoms: angular.copy($scope.allSymptoms)
        }
      };
      outpatientImportModal.open(record, $scope.resource, $scope.editTemplate, angular.copy(modalScopeOptions)).result.then(reload);
    };
  });
};
