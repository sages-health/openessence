'use strict';

var angular = require('angular');
var directives = require('../scripts/modules').directives;

angular.module(directives.name).directive('outpatientVisualization', function ($http, $modal, gettextCatalog,
                                                                               sortString, FrableParams,
                                                                               OutpatientVisit) {
  return {
    restrict: 'E',
    template: require('./visualization.html'),
    scope: {
      queryString: '=',
      records: '=?',
      close: '&onClose'
    },
    link: {
      // runs before nested directives, see http://stackoverflow.com/a/18491502
      pre: function (scope) {
        scope.records = scope.records || [];
        scope.visualization = {
          name: 'table'
        };

        scope.pivot = {
          rows: [],
          cols: []
        };
        scope.pivotOptions = [
          {
            value: 'sex',
            label: gettextCatalog.getString('Sex')
          },
          {
            value: 'age',
            label: gettextCatalog.getString('Age')
          }
        ];

        // strings that we can't translate in the view, usually because they're in attributes
        scope.strings = {
          date: gettextCatalog.getString('Date'),
          sex: gettextCatalog.getString('Sex'),
          age: gettextCatalog.getString('Age'),
          symptoms: gettextCatalog.getString('Symptoms'),
          edit: gettextCatalog.getString('Edit')
        };

        var query = function (params) { // TODO ngResource
          return $http.get('/resources/outpatient-visit',
            {
              params: params
            });
        };

        scope.tableParams = new FrableParams({
          page: 1,
          count: 10,
          sorting: {
            date: 'desc'
          }
        }, {
          total: 0,
          counts: [], // hide page count control
          $scope: {
            $data: {}
          },
          getData: function($defer, params) {
            query({ // TODO don't let each visualization fetch its own data after all
              q: scope.queryString,
              from: (params.page() - 1) * params.count(),
              size: params.count(),
              sort: sortString.toElasticsearchString(params.orderBy()[0]) // we only support one level of sorting
            }).success(function (data) {
              params.total(data.total);
              $defer.resolve(data.results);
            });
          }
        });

        var reload = function () {
          if (scope.visualization.name === 'table') {
            scope.tableParams.reload();
          } else if (scope.visualization.name === 'crosstab') {
            // TODO make a pivot table with elasticsearch aggregations and set scope.tabularData
          }
        };

        scope.$watch('queryString', function () {
          reload();
        });

        scope.editVisit = function (record) {
          $modal.open({
            template: require('../partials/modal-edit.html'),
            controller: ['$scope', '$modalInstance', 'record', function ($scope, $modalInstance, record) {
              $scope.record = record;

              // the save button on the modal
              $scope.save = function () {
                // tell the form to save
                $scope.$broadcast('outpatientSave'); // "save" is a little too common for my comfort
              };

              // the cancel button on the modal
              $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
              };

              // called after the form has been successfully submitted to the server
              $scope.onSubmit = function () {
                $modalInstance.close(); // TODO highlight record that was modified
                reload();
              };
            }],
            resolve: {
              record: function () {
                return record;
              }
            }
          });
        };

        scope.deleteVisit = function (record) {
          $modal.open({
            template: require('../partials/delete-record.html'),
            controller: ['$scope', '$modalInstance', 'record', function ($scope, $modalInstance, record) {
              $scope.record = record;
              $scope.delete = function () {
                $modalInstance.close(record);
                OutpatientVisit.remove({_id: record._id}, function () {
                  reload();
                });
              };
              $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
              };
            }],
            resolve: {
              record: function () {
                return record;
              }
            }
          });
        };
      }
    }
  };
});
