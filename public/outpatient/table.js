'use strict';

var angular = require('angular');
var directives = require('../scripts/modules').directives;

angular.module(directives.name).directive('outpatientTable', /*@ngInject*/ function ($rootScope, $timeout, orderByFilter, FrableParams, OutpatientVisitResource, sortString, stringUtil) {
  return {
    restrict: 'E',
    template: require('./table.html'),
    scope: {
      records: '=?',
      queryString: '=',
      form: '=',
      options: '=?'
    },
    compile: function (element, attrs) {
      var condensed = angular.isDefined(attrs.condensed) && attrs.condensed !== 'false';

      return {
        pre: function (scope) {
          scope.condensed = condensed;
          scope.options = scope.options || {};
          scope.form = scope.form || {};

          scope.options.height = scope.options.height || 600;

          // index fields by name
          scope.$watch('form.fields', function (fields) {
            if (!fields) {
              return;
            }

            scope.fields = fields.reduce(function (fields, field) {
              fields[field.name] = field;
              return fields;
            }, {});
          });

          scope.editVisit = function (visit) {
            scope.$emit('outpatientEdit', visit);
          };

          scope.deleteVisit = function (visit) {
            scope.$emit('outpatientDelete', visit);
          };

          scope.$on('outpatientVisit.edit', function (angularEvent, event) {
            scope.tableParams.reload();
          });

          scope.$on('outpatientVisit.delete', function (angularEvent, event) {
            scope.tableParams.reload();
          });

          scope.tableParams = new FrableParams({
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
                  function error(response) {
                    $rootScope.$broadcast('filterError', response);
                  });
              }
            }
          });

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

          scope.printAggregate = function (field, showCount) {
            var includeCount = showCount || scope.form.dataType === 'aggregate';
            var print = [];
            if (field) {
              field.sort(stringUtil.compare).map(function (val) {
                print.push(val.name + (includeCount ? ('(' + val.count + ')') : ''));
              });
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
        }
      };
    }
  };
});
