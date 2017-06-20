'use strict';

var angular = require('angular');
var directives = require('../scripts/modules').directives;

angular.module(directives.name).directive('configGroup', /*@ngInject*/ function ($modal, stringUtil) {
  return {
    restrict: 'E',
    template: require('./config-group.html'),
    scope: {
      field: '=?',
      possibleValues: '=?'
    },
    compile: function () {
      return {
        pre: function (scope) {
          scope.getLocaleValue = stringUtil.getLocaleValue;
          
          scope.field = scope.field || {};
          scope.field.values = scope.field.values || [];
          scope.possibleValues = scope.possibleValues || [];

          scope.valueTemplate = '<div class="ngCellText">{{row.getProperty(col.field) | join }}</div>';
          scope.editButtonTemplate = '<button ng-click="edit(row.entity)" title="Edit">Edit</button>';
          scope.deleteButtonTemplate = '<button ng-click="delete(row.entity)" title="Remove">Delete</button>';

          scope.gridOptions = {
            data: 'field.values',
            enableColumnResize: true,
            multiSelect: false,
            columnDefs: [
              {field: 'name', width: 150, displayName: 'Name', cellEditableCondition: 'false'},
              {field: 'value', displayName: 'Value', cellTemplate: scope.valueTemplate, cellEditableCondition: 'false'},
              {displayName: 'Edit', width: 50, cellTemplate: scope.editButtonTemplate},
              {displayName: 'Delete', width: 70, cellTemplate: scope.deleteButtonTemplate}
            ]
          };

          // Modal that will allow group edit/create
          var openAddNewValueModal = function (groups, row) {
            return $modal.open({
              template: require('./config-group-modal.html'),
              backdrop: 'static',
              controller: ['$scope', '$modalInstance', function ($scope, $modalInstance) {
                $scope.noValues = false;
                $scope.row = angular.copy(row || {});
                $scope.possibleValues = scope.possibleValues;

                $scope.save = function (form) {
                  // check if form is valid
                  $scope.yellAtUser = form.$invalid;
                  if ($scope.yellAtUser) {
                    return;
                  }
                  $scope.noValues = $scope.row.value.length === 0;
                  // check if atleast one value selected
                  if ($scope.noValues) {
                    return;
                  }
                  // ensure group name is unique, not reusing existing group name
                  if ((row && row.name !== $scope.row.name) || !row) {
                    $scope.nameInUse = !groups.every(function (val) {
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
              }]
            });
          };

          // Create/Edit a group
          scope.edit = function (row) {
            // open a modal to enter a new value
            openAddNewValueModal(scope.field.values, row).result
              .then(function (group) {
                // only insert if it is a new group
                if (!row) {
                  scope.field.values.push(group);
                } else {
                  // update existing entry
                  scope.field.values.forEach(function (val, ix) {
                    if (val.name === row.name) {
                      angular.extend(scope.field.values[ix], group);
                    }
                  });
                }
              });
          };

          // Delete selected group
          scope.delete = function (row) {
            var rowIndex = -1;
            scope.field.values.forEach(function (val, index) {
              if (val.name === row.name) {
                rowIndex = index;
              }
            });
            if (rowIndex !== -1) {
              scope.field.values.splice(rowIndex, 1);
            }
          };

          // Remove all groups
          scope.removeAll = function () {
            scope.field.values = [];
          };

        }
      };
    }
  };
});
