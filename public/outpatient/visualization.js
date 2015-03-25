'use strict';

var angular = require('angular');
var directives = require('../scripts/modules').directives;
var moment = require('moment');

angular.module(directives.name).directive('outpatientVisualization', /*@ngInject*/ function ($modal, $rootScope, $log, debounce, orderByFilter, gettextCatalog, sortString, FrableParams, OutpatientVisitResource, outpatientEditModal, updateURL, outpatientDeleteModal, scopeToJson, outpatientAggregation, visualization, stringUtil) {

  return {
    restrict: 'E',
    template: require('./visualization.html'),
    scope: {
      filters: '=',
      form: '=?',
      queryString: '=', // TODO use filters instead
      visualization: '=?',
      pivot: '=?',
      options: '=?', // settings as single object, useful for loading persisted state
      source: '=?',
      widget: '=?'
    },
    link: {
      // runs before nested directives, see http://stackoverflow.com/a/18491502
      pre: function (scope, element) {

        scope.options = scope.options || {};
        scope.form = scope.form || {};

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

        scope.visualization = scope.visualization || scope.options.visualization || {
          name: 'table'
        };

        scope.pivot = scope.pivot || scope.options.pivot || {
          rows: [],
          cols: []
        };

        scope.pivotOptions = scope.pivotOptions || scope.options.pivotOptions || {
          rows: [],
          cols: []
        };

        scope.aggData = [
          //{ key: 'One',   value: Math.floor(Math.random()*20) } -- pie
          //{ key: 'Series', values:[{ key: 'One',   value: Math.floor(Math.random()*20) }]} -- bar
        ];

        scope.crosstabData = [];

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

        scope.$on('visualizationNameChanged', function () {
          delete scope.options.labels;
          updateVisualization();
        });

        scope.$on('exportVisualization', function () {
          if (scope.visualization.name === 'line' || scope.visualization.name === 'yoy') {
            // let timeSeries directive handle it
            return;
          } else if (scope.visualization.name === 'table') {
            visualization.csvExport(scope.queryString);
            return;
          }

          // Don't include es documents in our document. Elasticsearch throws a nasty exception if you do.
          var state = scopeToJson(scope);
          var arr = ['data', 'crosstabData'];
          angular.forEach(arr, function (k) {
            delete state[k];
          });
          if (state.tableParams) {
            delete state.tableParams.data;
          }

          state.source = 'export';

          visualization.export(state);
        });

        scope.$on('saveVisualization', function () {
          if (scope.visualization.name === 'line' || scope.visualization.name === 'yoy') {
            // let timeSeries directive handle it
            return;
          }

          // Don't include es documents in our document. Elasticsearch throws a nasty exception if you do.
          var state = scopeToJson(scope);
          var arr = ['data', 'crosstabData'];
          angular.forEach(arr, function (k) {
            delete state[k];
          });
          if (state.tableParams) {
            delete state.tableParams.data;
          }

          visualization.save(state);
        });

        var queryData = function (resultFn) {
          OutpatientVisitResource.get({
            size: 999999,
            q: scope.queryString
          }, function (data) {
            var records = outpatientAggregation.parseResults(data, scope);
            resultFn(records);
          });
        };

        var aggReload2 = function () {
          queryData(function (records) {
            //scope.crosstabData = records;
            var opts = {
              rows: angular.copy(scope.pivotOptions.rows) || [],
              cols: angular.copy(scope.pivotOptions.cols) || []
            };
            var cdata = outpatientAggregation.getCrosstabularData(records, opts, scope);
            scope.aggData = cdata;
          });
        };

        var reload = function () {
          debounce(reloadDebounce, 500).call();
        };

        var reloadDebounce = function () {
          scope.pivotOptions = angular.copy(scope.pivot);

          if (scope.visualization.name === 'table') {
            //scope.tableParams.reload();
          } else if (scope.visualization.name === 'pie') {
            aggReload2();
          } else if (scope.visualization.name === 'bar') {
            aggReload2();
          } else if (scope.visualization.name === 'map') {
            aggReload2();
          } else if (scope.visualization.name === 'crosstab') {
            queryData(function (records) {
              scope.crosstabData = records;
            });
          }
        };

        scope.$on('outpatientEdit', function (event, visit) {
          outpatientEditModal.open({record: visit, form: scope.form})
            .result
            .then(function () {
              //reload(); // TODO highlight changed record
              $rootScope.$broadcast('outpatientVisit.edit');
            });
        });
        scope.$on('outpatientDelete', function (event, visit) {
          outpatientDeleteModal.open({record: visit})
            .result
            .then(function () {
              //reload();
              $rootScope.$broadcast('outpatientVisit.edit');
            });
        });

        scope.getWeek = function (date) {
          return moment(date).format('W');
        };
        scope.getYear = function (date) {
          return moment(date).format('GGGG');
        };

        scope.$watch('queryString', function () {
          updateURL.updateFilters(scope.filters);
          reload();
        });

        var updateVisualization = function () {
          delete scope.options.options;
          updateURL.updateVisualization(scope.options.id, {
            options: scope.options,
            pivot: scope.pivot,
            pivotOptions: scope.pivotOptions,
            rows: scope.pivot.rows || [],
            series: scope.pivot.cols || [],
            visualization: scope.visualization
          });
        };

        scope.$watch('pivot.cols', function (newValue, oldValue) {
          if (newValue !== oldValue) {
            updateVisualization();
            reload();
          }
        });

        scope.$watch('pivot.rows', function (newValue, oldValue) {
          if (newValue !== oldValue) {
            updateVisualization();
            reload();
          }
        });

        scope.$watch('visualization.name', function (newValue, oldValue) {
          if (newValue !== oldValue) {
            updateVisualization();
            reload();
          }
        });

        scope.$on('outpatientVisit.edit', function (angularEvent, event) {
          reload();
        });

        scope.$on('elementClick.directive', function (angularEvent, event) {
          var filter;
          if (event.point.col && event.point.colName.indexOf('missing') !== 0) {
            filter = {
              filterID: event.point.col,
              value: event.point.colName
            };
            $rootScope.$emit('filterChange', filter, true, true);
          }
          if (event.point.row && event.point.rowName.indexOf('missing') !== 0) {
            filter = {
              filterID: event.point.row,
              value: event.point.rowName
            };
            $rootScope.$emit('filterChange', filter, true, true);
          }
        });

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
    }
  };
});
