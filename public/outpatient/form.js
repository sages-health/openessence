'use strict';

var angular = require('angular');
var directives = require('../scripts/modules').directives;

/**
 * A reusable edit form. Currently only used in the modal edit, but could be used in other places.
 */
// @ngInject
module.exports = function ($parse, OutpatientVisitResource) {
  return {
    restrict: 'E',
    template: require('./form.html'),
    transclude: true,
    scope: {
      form: '=',
      page: '=',
      paging: '=',
      onSubmit: '&',
      record: '=?' // to populate fields
    },
    compile: function () {
      return {
        pre: function (scope) {
          scope.dataType = scope.form.dataType;  //aggregate or individual
          scope.page = scope.page || 1;
          scope.paging = scope.paging || false;
          scope.record = scope.record || {};
          scope.visit = angular.copy(scope.record._source) || {};

          // namespace for "Other" fields, e.g. other pre-existing conditions not listed
          scope.others = {};

          // Fields that have count: X. We need to add count: 1 to them on individual form
          //TODO use possibleFilters[field].aggregation.nested
          var aggregateFields = ['symptoms', 'syndromes', 'diagnoses'];

          // convert array of fields to object indexed by field name
          // TODO keep order of fields
          scope.fields = scope.form.fields.reduce(function (fields, field) {
            var aggregateField = (scope.form.dataType === 'aggregate' && aggregateFields.indexOf(field.name) > -1 );
            if (field.enabled && field.values && !aggregateField) { //not an aggregatedField, ok to convert to string

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
                if(field.name === 'antiviral.exposure' || field.name === 'patient.sex' || field.name === 'patient.pregnant.is'){
                  if(angular.isString(existingValues)){
                    existingValues = valuesByName[existingValues] ? valuesByName[existingValues].value : '';
                  }
                } else if (Array.isArray(existingValues)) {
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

          //TODO remove sites hack when UI supports object representation
          // current workaround for medicalFacility.sites
          scope.medicalFacility = {'sites': {}};
          if (scope.fields['medicalFacility.sites.total'].enabled) {
            scope.medicalFacility.sites.total = $parse('medicalFacility.sites.total')(scope.record._source) || 0;
          }
          if (scope.fields['medicalFacility.sites.reporting'].enabled) {
            scope.medicalFacility.sites.reporting = $parse('medicalFacility.sites.reporting')(scope.record._source) || 0;
          }

          scope.includesOther = function (model) {
            return model && model.indexOf('Other') !== -1;
          };

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

          scope.isInFuture = function (date) {
            if (!date) {
              return false;
            }

            if (!angular.isDate(date)) {
              date = new Date(date);
            }

            return date.getTime() > Date.now();
          };

          scope.datePopupsOpen = {};
          scope.openDatePopup = function (name, $event) {
            $event.preventDefault();
            $event.stopPropagation();
            scope.datePopupsOpen[name] = !scope.datePopupsOpen[name];
          };

          scope.allSymptoms = scope.fields.symptoms ? scope.fields.symptoms.values.map(function (v) {
            return {name: v.name};
          }) : [];
          scope.allSyndromes = scope.fields.syndromes ? scope.fields.syndromes.values.map(function (v) {
            return {name: v.name};
          }) : [];
          scope.allDiagnoses = scope.fields.diagnoses ? scope.fields.diagnoses.values.map(function (v) {
            return {name: v.name};
          }) : [];

          var addDefaultFieldsToDataField = function (dataElement, allPossibleValues) {
            dataElement = dataElement ? dataElement : [];
            allPossibleValues.forEach(function (el) {
              var found = dataElement.filter(function (a) {
                return a.name === el.name;
              });
              if (found.length === 0) {
                dataElement.push({name: el.name});
              }
            });
            return dataElement;
          };

          if (scope.form.dataType === 'aggregate') {
            scope.visit.symptoms = addDefaultFieldsToDataField(scope.visit.symptoms, scope.allSymptoms);
            scope.visit.syndromes = addDefaultFieldsToDataField(scope.visit.syndromes, scope.allSyndromes);
            scope.visit.diagnoses = addDefaultFieldsToDataField(scope.visit.diagnoses, scope.allDiagnoses);
          }

          scope.symptomsGridOptions = {
            data: 'visit.symptoms',
            enableRowSelection: false,
            enableCellSelection: true,
            enableCellEditOnFocus: true,
            columnDefs: [
              {field: 'name', displayName: 'Name', cellEditableCondition: 'false'},
              {field: 'count', displayName: 'Count'}
            ]
          };

          scope.syndromesGridOptions = {
            data: 'visit.syndromes',
            enableRowSelection: false,
            enableCellSelection: true,
            enableCellEditOnFocus: true,
            columnDefs: [
              {field: 'name', displayName: 'Name', cellEditableCondition: 'false'},
              {field: 'count', displayName: 'Count'}
            ]
          };

          scope.diagnosesGridOptions = {
            data: 'visit.diagnoses',
            enableRowSelection: false,
            enableCellSelection: true,
            enableCellEditOnFocus: true,
            columnDefs: [
              {field: 'name', displayName: 'Name', cellEditableCondition: 'false'},
              {field: 'count', displayName: 'Count'}
            ]
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
              if (recordToSubmit.patient.sex !== 'F') {
                // can't be pregnant without being female, modus tollens FTW!
                delete recordToSubmit.patient.pregnant;
              } else if (recordToSubmit.patient.pregnant && !recordToSubmit.patient.pregnant.is) {
                delete recordToSubmit.patient.pregnant.trimester;
              }

              // antiviral name || antiviral source -> antiviral exposure
              if (recordToSubmit.antiviral && recordToSubmit.antiviral.exposure === 'N') {
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
              //TODO currently we write "new" data to district {name: value} even if it is disabled and
              // that does not match the mapping in outpatient.  For now do not write data if the field is disabled
              // from the form. This WILL DELETE, we need to handle this better so the form mapping matches the data.
              if (!field.values || !field.enabled) {
                return;
              }

              var aggregateField = (scope.form.dataType === 'aggregate' && aggregateFields.indexOf(field.name) > -1 );
              if (aggregateField) {
                // only store objects having count value
                recordToSubmit[field.name] = recordToSubmit[field.name].filter(function (el) {
                  return el.count !== '' && !isNaN(el.count);
                });
                recordToSubmit[field.name].forEach(function (e) {
                  e.count = parseInt(e.count, 0);
                });
              } else {
                var selectedValues = field.expression(recordToSubmit);
                if (!selectedValues) {
                  // user didn't select anything
                  return;
                }

                // map id(value) to displayValue(name)
                if (field.name === 'antiviral.exposure' || field.name === 'patient.sex' || field.name === 'patient.pregnant.is') {
                  angular.forEach(field.valuesByName, function (val) {
                    if (val.value === selectedValues) {
                      selectedValues = val.name;
                    }
                  });

                } else if (field.name === 'medicalFacility.location.district' || field.name === 'antiviral.source' || field.name === 'antiviral.name') {
                  //no-op
                } else {
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
                }
                field.expression.assign(recordToSubmit, selectedValues);
              }
            });

            if (scope.dataType === 'individual') {
              // add count: 1 to aggregate stored fields under individual dataType
              aggregateFields.forEach(function (field) {
                if (recordToSubmit[field]) {
                  recordToSubmit[field].forEach(function (v) {
                    v.count = 1;
                  });
                }
              });
            }
            //TODO remove sites hack
            //current hard code to add sites { total, reporting }
            //this is due to the medicalFacility object being converted to a string for ng-model/drop down
            if (scope.fields['medicalFacility.sites.total'].enabled || scope.fields['medicalFacility.sites.reporting'].enabled) {
              angular.extend(recordToSubmit['medicalFacility'], {'sites': scope.medicalFacility.sites});
            }

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

          scope.$on('next-page', function nextPage() {
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

          scope.$on('previous-page', function previousPage() {
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
