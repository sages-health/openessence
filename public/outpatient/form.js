'use strict';

var angular = require('angular');
var directives = require('../scripts/modules').directives;

/**
 * A reusable edit form. Currently only used in the modal edit, but could be used in other places.
 */
// @ngInject
module.exports = function (gettextCatalog, OutpatientVisitResource, FormResource) {
  return {
    restrict: 'E',
    template: require('./form.html'),
    transclude: true,
    scope: {
      page: '=',
      onSubmit: '&',
      record: '=?' // to populate fields
    },
    compile: function () {
      return {
        pre: function (scope) {
          scope.page = scope.page || 1;
          scope.record = scope.record || {};
          scope.visit = angular.copy(scope.record._source) || {};

          // fields that have count: X, we need to do some magic to make them work
          var aggregateFields = ['symptoms', 'diagnoses'];

          // strip counts from non-aggregate records since they make model equality
          // (e.g. selecting correct dropdown value) difficult
          aggregateFields.forEach(function (field) {
              if (scope.visit[field]) {
                scope.visit[field] = scope.visit[field].map(function (c) {
                  return c.name;
                });
              }
            });

          // TODO form can be quite large (>20KB for demo) since it includes every possible value for dropdowns
          // that's probably not an issue for most sites collecting a handful of diagnoses at a few sites,
          // but could be an issue for sites collecting a lot of symptoms, diagnoses, etc.
          // "Correct" solution would involve linking to other resources and then fetching them on demand, e.g.
          // returning JSON HAL and then querying for dropdown values as needed. In the meantime, at least it's cached.
          FormResource.get({size: 1, q: 'name:demo'}, function (response) {
            if (response.results.length === 0) {
              throw new Error('No configured forms');
            }

            var form = response.results[0]._source;

            // convert array of fields to object indexed by field name
            scope.fields = form.fields.reduce(function (fields, field) {
              if (field.values) {
                var values = field.values.reduce(function (values, v) {
                  // TODO still need to call gettextCatalog.getString('string') so that it can be extracted
                  values[v.name] = gettextCatalog.getString(v.name);
                  return values;
                }, {});

                // Add any values that are on the record but that we don't know about. Otherwise, the edit
                // form will list this field as blank when it really isn't
                if (scope.visit[field.name]) {
                  scope.visit[field.name].forEach(function (v) {
                    values[v] = gettextCatalog.getString(v);
                  });
                }

                field.values = values;
              }

              fields[field.name] = field;
              return fields;
            }, {});
          });

          scope.agePlaceholder = gettextCatalog.getString('Patient\'s age');
          scope.yellAtUser = false;

          scope.isInvalid = function (field) {
            if (!field) {
              // this happens when you switch pages
              return;
            }
            if (scope.yellAtUser) {
              // if the user has already tried to submit, show them all the fields they're required to submit
              return field.$invalid;
            } else {
              // only show a field's error message if the user has already interacted with it, this prevents a ton of
              // red before the user has even interacted with the form
              return field.$invalid && !field.$pristine;
            }
          };

          scope.datePopupsOpen = {};
          scope.openDatePopup = function (name, $event) {
            $event.preventDefault();
            $event.stopPropagation();
            scope.datePopupsOpen[name] = !scope.datePopupsOpen[name];
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
                OutpatientVisitResource.get({id: scope.record._id}, function (newData) {
                  scope.conflictError = true;
                  scope.record = newData;
                  scope.visit = scope.record._source;
                  scope.page = 1;
                });
              }
            };

            // don't make destructive modification on scope.visit since we may have to redo form
            var recordToSubmit = angular.copy(scope.visit);
            aggregateFields.forEach(function (field) {
              if (recordToSubmit[field]) {
                recordToSubmit[field] = recordToSubmit[field].map(function (v) {
                  return {name: v, count: 1};
                });
              }
            });

            if (scope.record._id || scope.record._id === 0) { // TODO move this logic to OutpatientVisit
              OutpatientVisitResource.update({
                id: scope.record._id,
                version: scope.record._version
              }, recordToSubmit, cleanup, showError);
            } else {
              OutpatientVisitResource.save(recordToSubmit, cleanup, showError);
            }
          };

          var numPages = 4; // skip ILI surveillance page for now
          scope.$on('next-page', function () {
            scope.yellAtUser = !!scope.visitForm.$invalid;
            if (!scope.yellAtUser) {
              if (scope.page === numPages - 1) {
                scope.page = 'last'; // so modal-edit.html knows to add a submit button
              } else if (scope.page !== 'first') {
                scope.page++;
              }
            }
          });

          scope.$on('previous-page', function () {
            scope.yellAtUser = !!scope.visitForm.$invalid;
            if (!scope.yellAtUser) {
              if (scope.page === 'last') {
                scope.page = numPages - 1;
              } else if (scope.page !== 1) {
                scope.page--;
              }
            }
          });

          scope.$on('outpatientSave', function () {
            scope.submit(scope.visitForm);
          });
        }
      };
    }
  };
};

angular.module(directives.name).directive('outpatientForm', module.exports);
