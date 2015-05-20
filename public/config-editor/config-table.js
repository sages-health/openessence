'use strict';

var angular = require('angular');
var directives = require('../scripts/modules').directives;

angular.module(directives.name).directive('configTable', /*@ngInject*/ function ($modal, orderByFilter, ngTableParams) {
  return {
    restrict: 'E',
    template: require('./config-table.html'),
    scope: {
      field: '=?'
    },
    compile: function () {
      return {
        pre: function (scope) {
          scope.field = scope.field || {};
          scope.field.values = scope.field.values || [];

          scope.tableParams = new ngTableParams({
            page: 1, // page is 1-based
            count: 999,
            sorting: {
              name: 'asc'
            }
          }, {
            total: scope.field.values ? scope.field.values.length : 0,
            counts: [], // hide page count control
            getData: function ($defer, params) {
              var orderedData = params.sorting() ? orderByFilter(scope.field.values, params.orderBy()) : scope.field.values;
              $defer.resolve(orderedData.slice((params.page() - 1) * params.count(), params.page() * params.count()));
            }
          });

          scope.tableParams.reload();

          scope.$watchCollection('field.values', function () {
            scope.tableParams.reload();
          });

          // Modal that will allow group edit/create
          var openEditModal = function (values, row) {
            return $modal.open({
              template: require('./config-table-modal.html'),
              backdrop: 'static',
              controller: ['$scope', '$modalInstance', function ($scope, $modalInstance) {
                $scope.row = angular.copy(row || {});
                $scope.yellAtUser = false;

                $scope.isInvalid = function (field) {
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

                $scope.save = function (form) {
                  // check if form is valid
                  $scope.yellAtUser = !!form.$invalid;
                  if ($scope.yellAtUser) {
                    return;
                  }

                  // ensure name is unique, not reusing existing group name
                  if ((row && row.name !== $scope.row.name) || !row) {
                    $scope.nameInUse = !values.every(function (val) {
                      return val.name !== $scope.row.name;
                    });
                    if ($scope.nameInUse) {
                      return;
                    }
                  }

                  $modalInstance.close($scope.row);
                };

                $scope.closeModal = function () {
                  $modalInstance.dismiss('cancel');
                };
              }
              ]
            });
          };

          // Create/Edit a group
          scope.edit = function (row) {
            // open a modal to enter a new value
            openEditModal(scope.field.values, row).result
              .then(function (entry) {

                // update existing entry
                scope.field.values.forEach(function (val, ix) {
                  if (val.value === row.value) {
                    angular.extend(scope.field.values[ix], entry);
                  }
                });
              });
          };

        }
      };
    }
  };
});
