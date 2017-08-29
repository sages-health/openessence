'use strict';

var angular = require('angular');
var directives = require('../scripts/modules').directives;
var _ = require('lodash');

angular.module(directives.name).directive('configTableMapping', /*@ngInject*/ function ($modal, orderByFilter, NgTableParams) {
  return {
    restrict: 'E',
    template: require('./config-table-mapping.html'),
    scope: {
      field: '=?',
      regions: '=?'
    },
    compile: function () {
      return {
        pre: function (scope) {
          scope.field = scope.field || {};
          scope.field.values = scope.field.values || [];
          scope.regions = scope.regions || [{name: '', region: ''}];

          scope.tableParams = new NgTableParams({
            page: 1, // page is 1-based
            count: 999,
            sorting: {
              name: 'asc'
            }
          }, {
              total: scope.field.values ? scope.field.values.length : 0,
              counts: [], // hide page count control
              getData: function (params) {
                var orderedData = params.sorting() ? orderByFilter(scope.regions, params.orderBy()) : scope.regions;
                return orderedData.slice((params.page() - 1) * params.count(), params.page() * params.count());
              }
            });

          scope.tableParams.reload();

          scope.$watchCollection('field.regions', function () {
            scope.tableParams.reload();
          });

          // Modal that will allow group edit/create
          var openEditModal = function (values, row) {
            return $modal.open({
              template: require('./config-table-mapping-modal.html'),
              backdrop: 'static',
              controller: ['$scope', '$modalInstance', function ($scope, $modalInstance) {
                $scope.row = angular.copy(row || {});
                $scope.yellAtUser = false;
                $scope.regions = values;

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
            openEditModal(scope.regions, row).result
              .then(function (entry) {

                // update existing entry
                scope.regions.forEach(function (val, ix) {
                  if (val.name === row.name) {
                    angular.extend(scope.field.possibleValues[ix], entry);
                  }
                });
              });
          };

          scope.delete = function (row) {
            // open a modal to enter a new value

            scope.field.possibleValues = _.without(scope.field.possibleValues, row);

            /*scope.field.possibleValues.forEach(function (val, ix) {
              if (val.value === row.value) {
                scope.field.possibleValues.splice(ix, 1);
              }
            });*/
          };

          scope.add = function () {
            // open a modal to enter a new value
            var newRow = {name: '', region: ''};

            scope.field.possibleValues.push(newRow);
          };

        }
      };
    }
  };
});
