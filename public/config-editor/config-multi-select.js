'use strict';

var angular = require('angular');
var directives = require('../scripts/modules').directives;

angular.module(directives.name).directive('configMultiselect', /*@ngInject*/ function ($modal) {
  return {
    restrict: 'E',
    template: require('./config-multi-select.html'),
    scope: {
      field: '=?'
    },
    compile: function () {
      return {
        pre: function (scope) {

          var openAddNewValueModal = function (field) {
            return $modal.open({
              template: require('./new-possible-value-modal.html'),

              controller: ['$scope', '$modalInstance', function ($scope, $modalInstance) {
                $scope.field = field;
                $scope.data = {};
                $scope.save = function (form) {
                  if (form.$invalid) {
                    $scope.yellAtUser = true;
                    return;
                  }

                  $modalInstance.close($scope.data.value);
                };

                $scope.closeModal = function () {
                  $modalInstance.dismiss('cancel');
                };
              }]
            });
          };

          scope.removeAll = function (field) {
            field.values = [];
          };

          scope.addNewValue = function (field) {
            // open a modal to enter a new value
            openAddNewValueModal(field).result
              .then(function (newValue) {
                field.possibleValues.push({name: newValue});
                field.values.push(newValue);
              });
          };

        }
      };
    }
  };
});
