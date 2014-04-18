'use strict';

var angular = require('angular');
var directives = require('../scripts/modules').directives;

var lookupSearchParams = {
  from: 0,
  size: 10000,
  sort: 'name'// we only support one level of sorting
};

var pluckName = function (r) {
  return r._source.name;
};

/**
 * A reusable edit form. Currently only used in the modal edit, but could be used in other places.
 */
angular.module(directives.name).directive('outpatientForm', function ($http, gettextCatalog, OutpatientVisit, District,
                                                                      Diagnosis, Symptom) {
  return {
    restrict: 'E',
    template: require('./form.html'),
    transclude: true,
    scope: {
      onSubmit: '&',
      record: '=?' // to populate fields
    },
    compile: function () {
      return {
        pre: function (scope) {
          scope.record = scope.record || {};
          // we copy b/c don't want to update the workbench before we hit save!
          scope.visit = angular.copy(scope.record._source) || {};

          scope.agePlaceholder = gettextCatalog.getString('Patient\'s age');
          scope.weightPlaceholder = gettextCatalog.getString('Patient\'s weight');
          scope.yellAtUser = false;

          District.get(lookupSearchParams, function (response) {
            scope.districts = response.results.map(pluckName);
          });
          Symptom.get(lookupSearchParams, function (response) {
            scope.symptoms = response.results.map(pluckName);
          });
          Diagnosis.get(lookupSearchParams, function (response) {
            scope.diagnoses = response.results.map(pluckName);
          });

          scope.isInvalid = function (field) {
            if (scope.yellAtUser) {
              // if the user has already tried to submit, show them all the fields they're required to submit
              return field.$invalid;
            } else {
              // only show a field's error message if the user has already interacted with it, this prevents a ton of red
              // before the user has even interacted with the form
              return field.$invalid && !field.$pristine;
            }
          };

          scope.openReportDate = function ($event) {
            $event.preventDefault();
            $event.stopPropagation();
            scope.reportDateOpened = true;
          };

          scope.warnSystolic = function (bpSystolic) {
            // 180 is "hypertensive emergency" and 90 is hypotension according to Wikipedia
            return !!bpSystolic && (bpSystolic >= 180 || bpSystolic < 90);
          };

          scope.warnDiastolic = function (bpDiastolic) {
            return !!bpDiastolic && (bpDiastolic >= 110 || bpDiastolic < 60);
          };

          scope.submit = function (visitForm) {
            if (visitForm.$invalid) {
              scope.yellAtUser = true;
              return;
            }

            var cleanup = function () {
              scope.yellAtUser = false;
              scope.onSubmit(scope.visitForm);
            };

            if (scope.record._id || scope.record._id === 0) { // TODO move this logic to OutpatientVisit
              OutpatientVisit.update(angular.extend({_id: scope.record._id}, scope.visit), function () {
                cleanup();
              });
            } else {
              OutpatientVisit.save(scope.visit, function () {
                cleanup();
              });
            }
          };

          scope.$on('outpatientSave', function () {
            scope.submit(scope.visitForm);
          });
        }
      };
    }
  };
});
