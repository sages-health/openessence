'use strict';

var angular = require('angular');
var directives = require('../scripts/modules').directives;

angular.module(directives.name).directive('outpatientTable', function (gettextCatalog, orderByFilter, FrableParams,
                                                                       OutpatientVisit, sortString) {
  return {
    restrict: 'E',
    template: require('./table.html'),
    scope: {
      records: '=?'
    },
    compile: function (element, attrs) {
      var condensed = angular.isDefined(attrs.condensed) && attrs.condensed !== 'false';

      return {
        pre: function (scope) {
          scope.condensed = condensed;
          scope.strings = {
            date: gettextCatalog.getString('Date'),
            district: gettextCatalog.getString('District'),
            symptoms: gettextCatalog.getString('Symptoms'),
            diagnoses: gettextCatalog.getString('Diagnoses'),
            sex: gettextCatalog.getString('Sex'),
            age: gettextCatalog.getString('Age'),
            weight: gettextCatalog.getString('Weight'),
            bloodPressure: gettextCatalog.getString('Blood pressure'),
            pulse: gettextCatalog.getString('Pulse'),
            temperature: gettextCatalog.getString('Temperature'),
            returnVisit: gettextCatalog.getString('Return visit?'),
            patientId: gettextCatalog.getString('Patient ID'),
            oeId: gettextCatalog.getString('OE ID'),
            edit: gettextCatalog.getString('Edit')
          };

          scope.editVisit = function (visit) {
            scope.$emit('outpatientEdit', visit);
          };

          scope.deleteVisit = function (visit) {
            scope.$emit('outpatientDelete', visit);
          };

          scope.tableParams = new FrableParams({
            page: 1, // page is 1-based
            count: 10,
            sorting: {
              reportDate: 'desc'
            }
          }, {
            total: scope.records ? scope.records.length : 0,
            counts: [], // hide page count control
            $scope: {
              $data: {}
            },
            getData: function($defer, params) {
              if (scope.records) {
                var orderedData = params.sorting() ? orderByFilter(scope.records, params.orderBy()) : scope.records;
                $defer.resolve(orderedData.slice((params.page() - 1) * params.count(), params.page() * params.count()));
              } else {
                OutpatientVisit.get(
                  {
                    from: (params.page() - 1) * params.count(),
                    size: params.count(),
                    sort: sortString.toElasticsearchString(params.orderBy()[0]) // we only support one level of sorting
                  },
                  function (response) {
                    params.total(response.total);
                    $defer.resolve(response.results);
                  });
              }
            }
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
        }
      };
    }
  };
});
