'use strict';

var angular = require('angular');
var directives = require('../scripts/modules').directives;
var _ = require('lodash');

angular.module(directives.name).directive('outpatientTable',
  /*@ngInject*/ function ($rootScope, $timeout, orderByFilter, NgTableParams, OutpatientVisitResource, sortString,//
                          stringUtil, $filter) {
    return {
      restrict: 'E',
      template: require('./table.html'),
      scope: {
        records: '=?',
        queryString: '=',
        form: '=?',
        options: '=?',
        autoRunQuery: '='
      },
      compile: function (element, attrs) {
        var condensed = angular.isDefined(attrs.condensed) && attrs.condensed !== 'false';
        return {
          pre: function (scope) {
            scope.condensed = condensed;
            scope.options = scope.options || {};
            scope.form = scope.form || {};
            scope.columns = {};

            // scope.formLoaded flag is added so that table will not be rendered till form data is loaded.
            // ng-table-dynamic does not update column info ($columns) if table is already loaded...
            // TODO: find a better way of handling this
            scope.formLoaded = false;
            scope.columns = [];

            scope.$on("tableReload", function(events,args){
              scope.tableParams.reload();
            });

            scope.tableParams = new NgTableParams({ //FrableParams({
              page: 1, // page is 1-based
              count: 10,
              sorting: {
                visitDate: 'desc'
              }
            }, {
              total: scope.data ? scope.data.length : 0,
              counts: [], // hide page count control
              $scope: {
                $data: {}
              },

              getData: function (params) {
                  if (!angular.isDefined(scope.queryString)) {
                    // Wait for queryString to be set before we accidentally fetch a bajillion rows we don't need.
                    // If you really don't want a filter, set queryString='' or null
                    // TODO there's probably a more Angular-y way to do this
                    return [];
                  }
                  return  OutpatientVisitResource.get(
                    {
                      q: scope.queryString,
                      from: (params.page() - 1) * params.count(),
                      size: params.count(),
                      sort: sortString.toElasticsearchString(params.orderBy()[0]) // we only support one level of sorting
                    },
                    function (response) {
                      params.total(response.total);
                      scope.setRowCounts(scope.tableParams.total());
                      return response.results;

                    },
                    function error (response) {
                      $rootScope.$broadcast('filterError', response);

                    }).
                    $promise.then(function(data){
                      scope.data = data.results;
                      return data.results;
                    });
              },
            });


            var init = function () {
              if (!scope.form || !scope.form.fields) {
                return;
              }

              var fieldsMap = scope.form.fields.reduce(function (fields, field) {
                fields[field.name] = field;
                return fields;
              }, {});
              var columns = []
              _.forEach(scope.form.fields, function(field){
                var tableColumn = {title: field.localeName, sortable: field.sortable};

                if(_.get(field, 'table.type')){
                  tableColumn.type = field.table.type;
                }
                var found = _.get(field, 'table.field');
                if(found){
                  tableColumn.field = field.table.field
                }
                else{
                  tableColumn.field = field.name
                }
                tableColumn.name = field.name;

                tableColumn.isFilter = field.isFilter;

                columns.push(tableColumn);
              });

              angular.forEach(columns, function (column) {
                //Translate column headers
                column.title = $filter('i18next')(column.title);

                if (fieldsMap[column.field] || fieldsMap[column.name]) {
                  column.show = fieldsMap[column.field] && fieldsMap[column.field].enabled;
                } else if (column.field === 'patient.bloodPressure') { // column name is bloodPressure vs form fields are diastolic and systolic
                  column.show = (fieldsMap['patient.diastolic'] && fieldsMap['patient.diastolic'].enabled) ||
                  (fieldsMap['patient.systolic'] && fieldsMap['patient.systolic'].enabled) || false;
                } else {
                  console.log(column.field + ' - table column is not part of form.fields');
                  column.show = false;
                }
              });

              // Append auto-generated fields
              scope.form.fields.reduce(function (fields, field) {
                if (field.autogen && field.enabled) {
                  columns.push({title: $filter('i18next')(field.name), sortable: field.name, field: field.name, type: field.type || 'text', isFilter: field.isFilter});
                }
                return fields;
              }, {});

              // Add a column for edit/delete buttons
              columns.push({title: '', type: 'action'});
              scope.columns = columns;

              scope.formLoaded = true;

//              scope.$watchCollection('queryString', function () {
//                scope.tableParams.reload();
//              });

              scope.$watch(function () {
                  //check for change of panel height
                  return angular.element(".workbench-panel").height();
              }, function (hgt) {
                  //find panel where height changed and resize the parent visualization
                  var p = angular.element(".workbench-panel");
                  for (var i = 0; i < p.length; i++) {
                    if (angular.element(p[i]).height() === hgt)
                        angular.element(p[0]).closest('li.workbench-visualization').height(hgt);
                  }
              });

              /*  Disabled, pending validation, auto row count based on sizing - 4/17/17 (KFischer)
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
              */

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

            scope.hasValue = function(row, field){
              var val = scope.getValue(row, field)
              if (angular.isArray(val)) {
                return scope.printAggregate(val);
              }
              var testValue = scope.getValue(row, field + '.name') || val
              return testValue !== undefined && testValue !== null;
            }

            scope.getValue = function (row, field) {
              var value = field.split('.').reduce(function (obj, i) { //traverse down parent.child.prop key
                if(obj){
                  if(Array.isArray(obj)){
                    return obj;
                  }
                  else{
                    return obj[i];
                  }
                }else{
                  return undefined;
                }

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

            scope.$watch('queryString', function (fields) {
              if(scope.autoRunQuery)
                scope.tableParams.reload();
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

            scope.setRowCounts = function (total) {
              scope.tableParams.settings({counts: function(){
                var counts = [];
                angular.forEach([10,25,50], function(cnt) {
                  if (cnt < total)
                    counts.push(cnt);
                });
                counts.push(total);
                return counts;
                }()});
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
