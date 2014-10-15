'use strict';

var angular = require('angular');
var directives = require('../scripts/modules').directives;

/**
 * A reusable edit form. Currently only used in the modal edit, but could be used in other places.
 */
// @ngInject
module.exports = function ($parse, gettextCatalog, OutpatientVisitResource) {
  return {
    restrict: 'E',
    template: require('./form.html'),
    transclude: true,
    scope: {
      form: '=',
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

          // namespace for "Other" fields, e.g. other pre-existing conditions not listed
          scope.others = {};

          // Fields that have count: X. We need to add count: 1 to them on individual form
          var aggregateFields = ['symptoms', 'diagnoses'];

          // convert array of fields to object indexed by field name
          // TODO keep order of fields
          scope.fields = scope.form.fields.reduce(function (fields, field) {
            if (field.values) {
              // index values by name to make lookups easy
              var valuesByName = field.values.reduce(function (values, v) {
                values[v.name] = v;
                return values;
              }, {});

              // $parse is fairly expensive, so it's best to cache the result
              field.expression = $parse(field.name);

              // Add any values that are on the record but that we don't know about. Otherwise, the edit
              // form will list this field as blank when it really isn't
              var existingValues = field.expression(scope.visit);
              if (existingValues) {
                if (Array.isArray(existingValues)) {
                  existingValues = existingValues.map(function (v) {
                    valuesByName[v.name] = v; // side effect inside map!

                    // convert from object to string b/c ng-model is dumb and doesn't like binding to objects
                    return v.name;
                  });
                } else if (existingValues.name) {
                  valuesByName[existingValues.name] = existingValues;
                  existingValues = existingValues.name;
                }

                field.expression.assign(scope.visit, existingValues);
              }

              // convert values back to an array
              field.values = Object.keys(valuesByName).map(function (name) {
                // Convert values to strings b/c ng-model is dumb. They get converted back to objects when we submit
                return valuesByName[name];
              });

              field.valuesByName = valuesByName;
            }

            fields[field.name] = field;
            return fields;
          }, {});

          scope.includesOther = function (model) {
            return model && model.indexOf('Other') !== -1;
          };

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

            // Clear conditional fields whose pre-conditions aren't met. We don't do this on the form itself b/c
            // reversible actions. E.g. if you un-check and then immediately re-check the "Pregnant" checkbox, all
            // the conditional pregnancy fields, e.g. trimester, should still be there.
            var deleteConditionalFields = function (recordToSubmit) {
              if (!recordToSubmit.patient) {
                return;
              }

              // trimester -> pregnant -> female
              if (recordToSubmit.patient.sex !== 'female') {
                // can't be pregnant without being female, modus tollens FTW!
                delete recordToSubmit.patient.pregnant;
              } else if (recordToSubmit.patient.pregnant && !recordToSubmit.patient.pregnant.is) {
                delete recordToSubmit.patient.pregnant.trimester;
              }

              // antiviral name || antiviral source -> antiviral exposure
              if (recordToSubmit.antiviral && !recordToSubmit.antiviral.exposure) {
                delete recordToSubmit.antiviral.name;
                delete recordToSubmit.antiviral.source;
              }

              return recordToSubmit;
            };

            recordToSubmit = deleteConditionalFields(recordToSubmit);

            // replace all 'Other' dropdown values with the supplied value
            Object.keys(scope.others).forEach(function (other) {
              var otherValue = scope.others[other];
              if (!otherValue) {
                return;
              }

              // other is something like 'patient.preExistingConditions', so we need to convert that to an actual
              // object reference
              var otherExp = $parse(other);
              var otherModel = otherExp(recordToSubmit);

              if (Array.isArray(otherModel)) {
                // multi-selects have array models, need to remove "Other" entry and add custom value

                var otherIndex = otherModel.indexOf('Other');
                if (otherIndex !== -1) {
                  // remove "Other"
                  otherModel.splice(otherIndex, 1);
                }

                // add custom value
                otherModel.push(otherValue);
              } else if (otherModel === 'Other') {
                // single select, just replace 'Other' with the value
                otherModel = otherValue;
              } else if (otherModel.name === 'Other') {
                // this can only happen if we go back to binding to objects
                otherModel = otherValue;
              }

              otherExp.assign(recordToSubmit, otherModel);
            });

            // replace strings with the object they represent, need to do this b/c ng-model is dumb
            Object.keys(scope.fields).forEach(function (fieldName) {
              var field = scope.fields[fieldName];
              if (!field.values) {
                return;
              }

              var selectedValues = field.expression(recordToSubmit);
              if (!selectedValues) {
                // user didn't select anything
                return;
              }

              if (Array.isArray(selectedValues)) {
                // multi-select
                selectedValues = selectedValues.map(function (v) {
                  if (v.name) {
                    // already an object
                    return v;
                  } else {
                    // won't be in field.valuesByName if it's an "Other"
                    return field.valuesByName[v] || {name: v};
                  }
                });
              } else {
                // single-select
                if (!selectedValues.name) {
                  selectedValues = field.valuesByName[selectedValues] || {name: selectedValues};
                }
              }

              field.expression.assign(recordToSubmit, selectedValues);
            });

            // add count: 1 to aggregate fields
            aggregateFields.forEach(function (field) {
              if (recordToSubmit[field]) {
                recordToSubmit[field].forEach(function (v) {
                  v.count = 1;
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
        },

        post: function (scope, element) {
          // have to do this after all child directives are done rendering
          var numPages = element.find('form > fieldset').length;

          var isBlankPage = function (page) {
            if (page === 'last') {
              // last page is the one that gets the submit button, so it has to be shown
              // TODO move submit buttons if last page is blank
              return false;
            }

            return element.find('form > fieldset:nth-child(' + page + ')')
              .find('*[data-field]')
              .map(function () {
                return this.getAttribute('data-field');
              })
              .toArray()
              .every(function (field) { // using universal quantification means we can fail fast
                return !scope.fields[field].enabled;
              });
          };

          scope.$on('next-page', function nextPage () {
            scope.yellAtUser = !!scope.visitForm.$invalid;
            if (!scope.yellAtUser) {
              if (scope.page === numPages - 1) {
                scope.page = 'last'; // so modal-edit.html knows to add a submit button
              } else if (scope.page !== 'first') {
                scope.page++;
              }

              if (isBlankPage(scope.page)) {
                nextPage();
              }
            }
          });

          scope.$on('previous-page', function previousPage () {
            scope.yellAtUser = !!scope.visitForm.$invalid;
            if (!scope.yellAtUser) {
              if (scope.page === 'last') {
                scope.page = numPages - 1;
              } else if (scope.page !== 1) {
                scope.page--;
              }

              if (isBlankPage(scope.page)) {
                previousPage();
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
