'use strict';

var angular = require('angular');
var directives = require('../scripts/modules').directives;

var pluckName = function (r) {
  return r._source.name;
};

/**
 * A reusable edit form. Currently only used in the modal edit, but could be used in other places.
 */
angular.module(directives.name).directive('outpatientForm', function (gettextCatalog, OutpatientVisit, District, Diagnosis, Symptom) {
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
          scope.visit = angular.copy(scope.record._source) || {};

          if (scope.visit.symptoms) {
            scope.visit.symptoms = scope.visit.symptoms.map(function (r){
              return r.name;
            });
          }
          if (scope.visit.diagnoses) {
            scope.visit.diagnoses = scope.visit.diagnoses.map(function (r){
              return r.name;
            });
          }

          scope.agePlaceholder = gettextCatalog.getString('Patient\'s age');
          scope.yellAtUser = false;

          // TODO use multi-get so we only have one XHR request
          var searchParams = {
            size: 100, // TODO search on demand if response indicates there are more records
            sort: 'name'
          };
          District.get(searchParams, function (response) {
            scope.districts = response.results.map(pluckName);
            if (scope.visit.district && scope.districts.indexOf(scope.visit.district) === -1) {
              scope.districts.push(scope.visit.district);
            }
          });
          Symptom.get(searchParams, function (response) {
            scope.symptoms = response.results.map(pluckName);
            if (scope.visit.symptoms) {
              scope.visit.symptoms.forEach(function (item) {
                if (scope.symptoms.indexOf(item.name) === -1) {
                  scope.symptoms.push(item.name);
                }
              });
            }
          });
          Diagnosis.get(searchParams, function (response) {
            scope.diagnoses = response.results.map(pluckName);
            if (scope.visit.diagnoses) {
              scope.visit.diagnoses.forEach(function (item) {
                if (scope.diagnoses.indexOf(item.name) === -1) {
                  scope.diagnoses.push(item.name);
                }
              });
            }
          });

          scope.isInvalid = function (field) {
            if (scope.yellAtUser) {
              // if the user has already tried to submit, show them all the fields they're required to submit
              return field.$invalid;
            } else {
              // only show a field's error message if the user has already interacted with it, this prevents a ton of
              // red before the user has even interacted with the form
              return field.$invalid && !field.$pristine;
            }
          };

          scope.openReportDate = function ($event) {
            $event.preventDefault();
            $event.stopPropagation();
            scope.reportDateOpened = true;
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

            var showError = function (data) {
              // if someone else has updated this record before you hit save
              if (data.status === 409) {
                // Get latest record data and update form
                OutpatientVisit.get({_id: scope.record._id}, function (newData) {
                  scope.conflictError = true;
                  scope.record = newData;
                  scope.visit = scope.buildVisit(scope.record._source);
                });
              }
            };

            scope.visit.symptoms = scope.visit.symptoms ? scope.visit.symptoms.map(function (r) {
              return {name: r, count: 1};
            }) : [];

            scope.visit.diagnoses = scope.visit.diagnoses ? scope.visit.diagnoses.map(function (r) {
              return {name: r, count: 1};
            }) : [];

            if (scope.record._id || scope.record._id === 0) { // TODO move this logic to OutpatientVisit
              OutpatientVisit.update({
                _id: scope.record._id,
                version: scope.record._version
              }, scope.visit, cleanup, showError);
            } else {
              OutpatientVisit.save(scope.visit, cleanup, showError);
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
