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
          scope.editEnabled = false;

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
          
          scope.showFieldEdit = function(){
            scope.editEnabled = !scope.editEnabled;
          }
      
          
          scope.possibleValueRemoved = function(item, model){
            for (var i=scope.field.values.length-1; i>=0; i--) {
              if (scope.field.values[i] === item.name) {
                scope.field.values.splice(i, 1);
                    // break;       //<-- Uncomment  if only the first term has to be removed
                }
            }
            
          }
          
          scope.removeAllPossibleValues = function (field) {
            field.possibleValues = [];
            field.values = [];
          };

          scope.addNewValue = function (field) {
            // open a modal to enter a new value
            openAddNewValueModal(field).result
              .then(function (newValue) {
                // Split user-entered values by semicolon
                var vals = newValue.split(";");
                vals.forEach(function (val) {
                  // Strip leading/trailing spaces and prevent duplicate values
                  var trimmedValue = val.replace(/^\s+|\s+$/g,'');
                  if (trimmedValue.length > 0 && field.values.indexOf(trimmedValue) === -1) {
                    field.possibleValues.push({name: trimmedValue});
                    field.values.push(trimmedValue);
                  }
                })
              });
          };

        }
      };
    }
  };
});
