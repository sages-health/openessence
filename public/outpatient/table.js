'use strict';

var angular = require('angular');
var directives = require('../scripts/modules').directives;

angular.module(directives.name).directive('outpatientTable',
  /*@ngInject*/ function ($rootScope, $timeout, orderByFilter, ngTableParams, OutpatientVisitResource, sortString,//
                          stringUtil, $filter) {
    return {
      restrict: 'E',
      template: require('./table.html'),
      scope: {
        records: '=?',
        queryString: '=',
        form: '=?',
        options: '=?'
      },
      compile: function (element, attrs) {
        var condensed = angular.isDefined(attrs.condensed) && attrs.condensed !== 'false';
        return {
          pre: function (scope) {
            scope.condensed = condensed;
            scope.options = scope.options || {};
            scope.form = scope.form || {};

            // scope.formLoaded flag is added so that table will not be rendered till form data is loaded.
            // ng-table-dynamic does not update column info ($columns) if table is already loaded...
            // TODO: find a better way of handling this
            scope.formLoaded = false;
            scope.columns = [];

            var init = function () {
              if (!scope.form || !scope.form.fields) {
                return;
              }

              var fieldsMap = scope.form.fields.reduce(function (fields, field) {
                fields[field.name] = field;
                return fields;
              }, {});

              var columns = [
                {title: 'op.VisitDate', sortable: 'visitDate', field: 'visitDate', type: 'date'},
                //{title: 'Week', sortable:'visitDate', field:'visitDate', type:'week'},
                //{title: 'Year', sortable:'visitDate', field:'visitDate', type:'year'},
                {title: 'op.SymptomOnset', sortable: 'symptomOnsetDate', field: 'symptomOnsetDate', type: 'date'},
                {title: 'op.Submitted', sortable: 'submissionDate', field: 'submissionDate', type: 'date'},
                {title: 'op.Facility', sortable: 'medicalFacility', field: 'medicalFacility', type: 'multi-select'},
                {title: 'op.District', sortable: 'medicalFacility.location.district', field: 'medicalFacility.location.district', type: 'shortString'},
                {title: 'op.SitesTotal', sortable: 'medicalFacility.sites.total', field: 'medicalFacility.sites.total'},
                {title: 'op.SitesReporting', sortable: 'medicalFacility.sites.reporting', field: 'medicalFacility.sites.reporting'},
                {title: 'op.PatientID', sortable: 'patient.id', field: 'patient.id'},
                {title: 'op.Name', sortable: 'patient.name', field: 'patient.name'},
                {title: 'op.Sex', sortable: 'patient.sex', field: 'patient.sex'},
                {title: 'op.Age', sortable: 'patient.age', field: 'patient.age', type: 'age'},
                {title: 'op.TelephoneNumber', sortable: 'patient.phone', field: 'patient.phone'},
                {title: 'op.Address', sortable: 'patient.address', field: 'patient.address'},
                {title: 'op.Weight', sortable: 'patient.weight', field: 'patient.weight'},
                {title: 'op.Temperature', sortable: 'patient.temperature', field: 'patient.temperature'},
                {title: 'op.Pulse', sortable: 'patient.pulse', field: 'patient.pulse'},
                {title: 'op.BloodPressure', sortable: 'patient.bloodPressure.diastolic', field: 'patient.bloodPressure', type: 'pressure'},
                {title: 'op.Pregnant', sortable: 'patient.pregnant.is', field: 'patient.pregnant.is'},
                {title: 'op.PreExistingConditions', sortable: 'patient.preExistingConditions', field: 'patient.preExistingConditions', type: 'text'},
                {title: 'op.Symptoms', field: 'symptoms', type: 'agg'},
                {title: 'op.Syndromes', field: 'syndromes', type: 'agg'},
                {title: 'op.Diagnoses', field: 'diagnoses', type: 'agg'},
                {title: 'op.Disposition', field: 'disposition', type: 'disposition'},
                {title: 'op.Antiviral', sortable: 'antiviral.name', field: 'antiviral.name'}
              ];

              angular.forEach(columns, function (column) {
                //Translate column headers
                column.title = $filter('i18next')(column.title);

                if (fieldsMap[column.field]) {
                  column.show = fieldsMap[column.field] && fieldsMap[column.field].enabled;
                } else if (column.field === 'patient.bloodPressure') { // column name is bloodPressure vs form fields are diastolic and systolic
                  column.show = (fieldsMap['patient.diastolic'] && fieldsMap['patient.diastolic'].enabled) ||
                  (fieldsMap['patient.systolic'] && fieldsMap['patient.systolic'].enabled);
                } else {
                  console.log(column.field + ' - table column is not part of form.fields');
                  column.show = false;
                }
              });

              // Append auto-generated fields
              scope.form.fields.reduce(function (fields, field) {
                if (field.autogen && field.enabled) {
                  columns.push({title: $filter('i18next')(field.name), sortable: field.name, field: field.name, type: field.type || 'text'});
                }
                return fields;
              }, {});

              // Add a column for edit/delete buttons
              columns.push({title: '', type: 'action'});
              scope.columns = columns;

              scope.tableParams = new ngTableParams({ //FrableParams({
                page: 1, // page is 1-based
                count: 10,
                sorting: {
                  visitDate: 'desc'
                }
              }, {
                total: scope.records ? scope.records.length : 0,
                counts: [], // hide page count control
                $scope: {
                  $data: {}
                },

                getData: function ($defer, params) {
                  if (scope.records) {
                    var orderedData = params.sorting() ? orderByFilter(scope.records, params.orderBy()) : scope.records;
                    $defer.resolve(orderedData.slice((params.page() - 1) * params.count(), params.page() * params.count()));
                  } else {
                    if (!angular.isDefined(scope.queryString)) {
                      // Wait for queryString to be set before we accidentally fetch a bajillion rows we don't need.
                      // If you really don't want a filter, set queryString='' or null
                      // TODO there's probably a more Angular-y way to do this
                      $defer.resolve([]);
                      return;
                    }
                    OutpatientVisitResource.get(
                      {
                        q: scope.queryString,
                        from: (params.page() - 1) * params.count(),
                        size: params.count(),
                        sort: sortString.toElasticsearchString(params.orderBy()[0]) // we only support one level of sorting
                      },
                      function (response) {
                        params.total(response.total);
                        $defer.resolve(response.results);

                      },
                      function error (response) {
                        $rootScope.$broadcast('filterError', response);
                      });
                  }
                }
              });
              scope.formLoaded = true;

              scope.$watchCollection('queryString', function () {
                scope.tableParams.reload();
              });

              scope.$watchCollection('[options.height, options.width]', function () {
                // Use a timer to prevent a gazillion table queries
                if (scope.tableTimeout) {
                  $timeout.cancel(scope.tableTimeout);
                  scope.tableTimeout = null;
                }
                scope.tableTimeout = $timeout(function () {
                  // TODO: Could this be done w/out redoing the query? Just roll the results differently on the client or cache
                  var rowHeight = 32;
                  var parent = document.getElementById('svg-id-' + scope.options.id);
                  if (!parent) { //we are on edit not the workbench
                    parent = document.getElementById('tableWidget');
                  }
                  var rows = parent.getElementsByTagName('tbody')[0].getElementsByTagName('tr');//JQUERY does not return, element.find('tbody tr');
                  angular.forEach(rows, function (row) {
                    var currRowHeight = angular.element(row).height();
                    rowHeight = currRowHeight > rowHeight ? currRowHeight : rowHeight;
                  });
                  var tbodyHeight = angular.element(parent.getElementsByTagName('tbody')[0]).height();
                  var numRows = Math.floor(((scope.options.height - 75)) / rowHeight);
                  if (!isNaN(numRows)) {
                    scope.tableParams.parameters({count: numRows});
                  }
                }, 25);
              });

              if (scope.records) {
                scope.$watchCollection('records', function () {
                  scope.tableParams.reload();
                });
              } else {
                scope.$on('outpatientReload', function () {
                  scope.tableParams.reload();
                });
              }
            };

            scope.getNamedValue = function (row, field) {
              var val = scope.getValue(row, field)
              if (angular.isArray(val)) {
                return scope.printAggregate(val);
              }
              return scope.getValue(row, field + '.name') || val;
            };

            scope.getValue = function (row, field) {
              var value = field.split('.').reduce(function (obj, i) { //traverse down parent.child.prop key
                return obj ? obj[i] : undefined;
              }, row);
              return value;
            };

            scope.options.height = scope.options.height || 600;

            // index fields by name
            scope.$watch('form.fields', function (fields) {
              if (!fields) {
                return;
              }
              init();
            });
            scope.getValueFromVisit = function (visit, field) {
              var value = field.split('.').reduce(function (obj, i) { //traverse down parent.child.prop key
                return obj ? obj[i] : undefined;
              }, visit);
              return value;
            };

            scope.$on('outpatientVisit.edit', function (angularEvent, event) {
              scope.tableParams.reload();
            });

            scope.$on('outpatientVisit.delete', function (angularEvent, event) {
              scope.tableParams.reload();
            });

            scope.editVisit = function (visit) {
              scope.$emit('outpatientEdit', visit);
            };

            scope.deleteVisit = function (visit) {
              scope.$emit('outpatientDelete', visit);
            };

            scope.printAggregate = function (field, showCount) {
              var includeCount = showCount || scope.form.dataType === 'aggregate';
              var print = [];
              if (field && angular.isArray(field)) {
                field.sort(stringUtil.compare).map(function (val) {
                  print.push(val.name + (includeCount ? ('(' + val.count + ')') : ''));
                });
              } else {
                return field;
              }
              return print.join(',');
            };

            scope.tableFilter = function (field, value) {
              //TODO multiselect if value.length > ?
              if (value || value === false) {
                var a = [].concat(value);
                angular.forEach(a, function (v) {
                  var filter = {
                    filterID: field,
                    value: ((typeof v) === 'object' ? v.name : v)
                  };
                  $rootScope.$emit('filterChange', filter, true, false);
                });
              }
            };
            init();
          }
        };
      }
    };
  });
