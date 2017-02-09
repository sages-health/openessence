'use strict';

var angular = require('angular');
//var $ = require('jquery');
// @ngInject
module.exports = function ($scope, $window, $rootScope, FormResource, $modal, stringUtil) {

  var init = function () {
    $scope.siteTemplate = {
      dataType: 'individual'
    };
    $scope.templateKeys = [];

    FormResource.get({ size: 99 }, function (response) {

      $scope.templates = response.results.reduce(function (templates, template) {
        if (template._source.name === 'site') {

          var temp = template._source;
          temp.fields.forEach(function (field) {
            if (!field.isGroup && field.formFieldType !== 'FixedLengthList' && field.values) {
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
      backdrop: 'static',
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
      if (!field.isGroup && field.formFieldType !== 'FixedLengthList' && field.values) {

        var possibleValuesByName = field.possibleValues.reduce(function (values, v) {
          values[v.name] = v;
          return values;
        }, {});
        field.values = field.values.map(function (val) {
          return possibleValuesByName[val] || { name: val };
        }).sort(stringUtil.compare);
      }
    });

    // Update form if it has an id
    if (template._id) {
      //FormResource.delete({id: template._id, type:'form', index: 'form"'}, onSuccess);
      var templateId = template._id;
      delete template._id;
      FormResource.update({ id: templateId }, template, onSuccess);
      //FormResource.save(template, onSuccess);
    }
    // create/save a new site form
    else {
      FormResource.save(template, onSuccess);
    }
  };

  var addSiteTemplate = function (templateName) {
    var fields = angular.copy($scope.templates[templateName].fields);

    fields.forEach(function (field) {
      // if field is mot a group field and it has values ==> it is a single/multi-select field
      if (!field.isGroup && field.formFieldType !== 'FixedLengthList' && field.values) {
        // field.possibleValues has all possible values
        // field.values has values admin wants to select for this site
        field.possibleValues = angular.copy(field.values);
        field.values = field.values.map(function (val) {
          return val.name;
        });
      }
    });
    $scope.siteTemplate.fields = fields;
    var groups = angular.copy($scope.templates[templateName].groups);
    $scope.siteTemplate.groups = groups;
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

  $scope.isNotGroupField = function (value) {
    return value.isGroup === undefined || value.isGroup === false;
  };

  $scope.groupField = function (field) {
    var groupField = $scope.siteTemplate.fields.filter(function (fld) {
      return field.groupName === fld.name;
    });
    return groupField.length > 0 ? groupField[0] : null;
  };

  $scope.openAddNewFieldModal = function () {
    return $modal.open({
      template: require('./config-new-field.html'),
      backdrop: 'static',
      controller: ['$scope', '$modalInstance', function (scope, modalInstance) {
        scope.noValues = false;
        scope.possibleValues = scope.possibleValues;

        scope.save = function (form) {
          // check if form is valid
          scope.yellAtUser = form.$invalid;
          if (scope.yellAtUser) {
            return;
          }
          // check if atleast one value selected
          if (scope.noValues) {
            return;
          }
          //POST /resource/form/{id}/_update {field:name other:attributes}


        };

        scope.closeModal = function () {
          modalInstance.dismiss('cancel');
        };
      }]
    });
  };

  init();
};
