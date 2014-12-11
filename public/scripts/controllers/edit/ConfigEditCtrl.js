'use strict';

var angular = require('angular');
//var $ = require('jquery');
// @ngInject
module.exports = function ($scope, $window, $rootScope, FormResource, $modal) {

  var init = function () {
    $scope.siteTemplate = {
      dataType: 'individual'
    };
    $scope.templateKeys = [];
    FormResource.get({size: 99}, function (response) {

      $scope.templates = response.results.reduce(function (templates, template) {
        if (template._source.name === 'site') {

          var temp = template._source;
          temp.fields.forEach(function (field) {
            if (field.values) {
              field.values = field.values.map(function (val) {
                return val.name;
              });
            }
          });
          // templates are stored as an array so that in future, user can select multiple templates
          if (angular.isArray(temp.templates)) {
            temp.templates = temp.templates[0];
          }
          $scope.siteTemplate = temp;
          $scope.siteTemplate._id = template._id;

        } else {
          $scope.templateKeys.push(template._source.name);
          templates[template._source.name] = template._source;
          templates[template._source.name]._id = template._id;
        }
        return templates;
      }, {});

      // Custom template should be listed last
      $scope.templateKeys.sort().reverse();

    });
  };
  $scope.setEnabled = function (val) {
    $scope.siteTemplate.fields.forEach(function (field) {
      field.enabled = val;
    });
  };

  $scope.cancel = function () {
    // reload page
    $window.location.reload();
  };

  var checkAllFieldsDisabled = function (template) {
    return template.fields.every(function (field) {
      return (field.enabled !== true);
    });
  };

  var openSaveTemplateModal = function (title, message) {
    return $modal.open({
      templateUrl: 'message.html',
      controller: ['$scope', '$modalInstance', function ($scope, $modalInstance) {
        $scope.title = title;
        $scope.message = message;
        $scope.closeModal = function () {
          $modalInstance.close();
        };
      }]
    });
  };

  $scope.save = function () {
    var onSuccess = function () {
      openSaveTemplateModal('Success', 'Configuration Saved').result
        .then(function () {
          $rootScope.$broadcast('configChange');
          // reload page once we save template
          // if we are saving this template first time, we want to get newly generated template ID
          $window.location.reload();
        });
    };

    $scope.siteTemplate.name = 'site';
    var template = angular.copy($scope.siteTemplate);

    // store templates as an array so that in future, user can select multiple templates
    if (angular.isString(template.templates)) {
      template.templates = [template.templates];
    }

    // ensure a template is selected and atleast one field enabled
    if (template.fields === undefined || template.fields.length === 0 || checkAllFieldsDisabled(template)) {
      if (template.templates === undefined || template.templates.length === 0) {
        openSaveTemplateModal('Error', 'Please select a template');
      } else {
        openSaveTemplateModal('Error', 'Please select one or more fields');
      }
      return;
    }

    template.fields.forEach(function (field) {
      // Ensure values has same format as possibleValues
      if (field.values) {
        var possibleValuesByName = field.possibleValues.reduce(function (values, v) {
          values[v.name] = v;
          return values;
        }, {});
        field.values = field.values.map(function (val) {
          return possibleValuesByName[val] || {name: val};
        });
      }

    });

    if (template._id) {
      FormResource.update({id: template._id}, template, onSuccess);
    } else {
      FormResource.save(template, onSuccess);
    }
  };

  var addSiteTemplate = function (templateName) {
    var fields = angular.copy($scope.templates[templateName].fields);

    fields.forEach(function (field) {

      // if field has values ==> it is a single/multi-select field
      if (field.values) {
        // field.possibleValues has all possible values
        // field.values has values admin wants to select for this site
        field.possibleValues = angular.copy(field.values);
        field.values = field.values.map(function (val) {
          return val.name;
        });
      }
    });

    $scope.siteTemplate.fields = fields;
  };

  $scope.$watch('siteTemplate.templates', function (newVals, oldVals) {
    if ($scope.siteTemplate._id !== undefined && oldVals === undefined) {
      return;
    }
    // first time loading config page
    if (newVals === undefined && oldVals === undefined) {
      return;
    }

    addSiteTemplate($scope.siteTemplate.templates);
  });
//  $scope.$watchCollection('siteTemplate.templates', function (newVals, oldVals) {
//    if ($scope.siteTemplate._id !== undefined && oldVals === undefined) {
//      return;
//    }
//    // first time loading config page
//    if (newVals === undefined && oldVals === undefined) {
//      return;
//    }
//
//    // if adding first one
//    if (oldVals === undefined) {
//      addSiteTemplate(newVals[0]);
//    }
//    // if adding more templates
//    else if (oldVals.length < newVals.length) {
//      var newName = newVals.filter(function (val) {
//        return oldVals.indexOf(val) === -1;
//      });
//
//      updateSiteTemplate(newName, true);
//    }
//    // if selected template removed
//    else if (oldVals.length > newVals.length) {
//
//    }
//  });

  var openAddNewValueModal = function (field) {
    return $modal.open({
      templateUrl: 'newValue.html',
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

  $scope.removeAll = function (field) {
    field.values = [];
  };

  $scope.addNewValue = function (field) {
    // open a modal to enter a new value
    openAddNewValueModal(field).result
      .then(function (newValue) {
        field.possibleValues.push({name: newValue});
        field.values.push(newValue);
      });
  };

  init();
};
