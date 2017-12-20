'use strict';

var angular = require('angular');
var _ = require('lodash');
//var $ = require('jquery');
// @ngInject
module.exports = function ($scope, $window, $rootScope, FormResource, LocaleResource, $modal, $http, stringUtil) {

  var init = function () {
    $scope.siteTemplate = {
      dataType: ''
    };
    $scope.templateKeys = [];
    $scope.getLocaleValue = stringUtil.getLocaleValue;

    FormResource.get({ size: 99 }, function (response) {

      $scope.templates = response.results.reduce(function (templates, template) {
        if (template._source.name === 'site') {

          var temp = template._source;
          temp.fields.forEach(function (field, indx) {
            if (!field.isGroup && field.formFieldType !== 'FixedLengthList' && field.values) {
              field.values = field.values.map(function (val) {
                return val.name;
              });
            }
            field.index = indx;
          });

          // templates are stored as an array so that in future, user can select multiple templates
          if (angular.isArray(temp.templates)) {
            temp.templates = temp.templates[0];
          }
          $scope.siteTemplate = temp;
          $scope.siteTemplate._id = template._id;

        } else {
          //save field order
          template._source.fields.forEach(function(field, indx){
            field.index = indx;
          });
          $scope.templateKeys.push(template._source.name);
          templates[template._source.name] = template._source;
          templates[template._source.name]._id = template._id;
        }
        return templates;
      }, {});

      // Custom template should be listed last
      $scope.templateKeys.sort().reverse();

      angular.element("#config-fields-table").sortable({cursor:"move"});

    });
  };
  $scope.setEnabled = function (val) {
    $scope.siteTemplate.fields.forEach(function (field) {
      if ( !field.locked ) {
        field.enabled = val;
      }
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
          $window.onbeforeunload = function() {
              window.scrollTo(0, 0);
          }
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

    //get HTML field order
    var tempFields = [];
    angular.element(".config-fields-row").each(function(){
       var indx = parseInt(this.attributes['rowindex'].value);
       tempFields.push(template.fields[indx]);
       var group = $scope.groupField(template.fields[indx]);
       if (group !== null){
        tempFields.push(template.fields[group.index]);
       }
    });

     //reorder template fields
    template.fields.length = 0;
    tempFields.forEach(function(field){
        template.fields.push(field);
    });

    template.explodeFields = []

    template.fields.forEach(function (field){
      if(field.table.type === 'agg'){
        template.explodeFields.push(field.name);
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

  $scope.isGISField = function (value) {
    return value.isGISField !== undefined && value.isGISField !== false;
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
        scope.data = {};
        scope.regionColumns = _.filter($scope.siteTemplate.fields, function(n){
          return n.useAsRegion;
        });
        scope.types = [
          {name: 'Date', value: 'date-range'},
          {name: 'Free Text', value: 'text'},
          //{name: 'Number', value: 'numeric-range'},
          {name: 'Single-Select List', value: 'multi-select'},
          {name: 'Multi-Select List (Aggregate Field)', value: 'agg'}
          ];

        scope.submitted = true;
        scope.fieldExists = function (newFieldName) {
          var exists = false;
          $scope.siteTemplate.fields.forEach(function (field) {
            var camelCase = _.camelCase(newFieldName)
            if(field.name === camelCase)
              exists = true;
          });
          return exists;
        };

        scope.fieldTypeExists = function (fieldType) {
          var exists = false;
          $scope.siteTemplate.fields.forEach(function (field) {

            if(field.table.type === fieldType)
              exists = true;
          });
          return exists;
        };

        scope.save = function (form) {
          // check if form is valid
          scope.yellAtUser = form.$invalid;
          scope.duplicateField = scope.fieldExists(scope.data.newFieldName);
          if(scope.duplicateField){
            form.newFieldName.$invalid = true;
            return;
          }
          scope.aggFieldExists = scope.fieldTypeExists('agg');
          scope.aggFieldExists = scope.aggFieldExists & scope.data.fieldType === 'agg'
          if(scope.aggFieldExists){
            form.$invalid = true;
            return;
          }

          if (scope.yellAtUser) {
            return;
          }
          // check if atleast one value selected
          if (scope.noValues) {
            return;
          }

          //POST /resource/form/{id}/_update {field:name other:attributes}
          $scope.siteTemplate.name = 'site';
          var template = angular.copy($scope.siteTemplate);

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

          var newField = {
              name: _.camelCase(scope.data.newFieldName),
              enabled: true,
              aggregable: true,
              locked: false,
              filter:
              {
                enabled: true,
                type: scope.data.fieldType
              },
              table:{
                enabled: true,
                type: scope.data.fieldType
              },
              localeName:  'op.' + scope.data.newFieldName.split(' ').join(''),
            };

          if(scope.data.fieldType === 'FixedLengthList'){
            newField.fieldType = 'FixedLengthList';
            newField.filter.type = 'multi-select'
            newField.table.type = 'multi-select'
          }
          else if(newField.filter.type === 'GIS'){
            newField.fieldType = 'GIS';
            newField.filter.type = 'multi-select'
            newField.table.type = 'multi-select'
          }
          else if(newField.filter.type === 'multi-select' && newField.table.type !== 'GIS'){
            newField.values = [{name: 'No Value'}];
            newField.possibleValues = [{name: 'No Value'}];
            newField.nested = true;
          }
          else if(newField.filter.type === 'agg'){
            newField.values = [{name: 'No Value'}];
            newField.possibleValues = [{name: 'No Value'}];
            newField.nested = true;
            newField.table.type = 'agg';
            newField.filter.type = 'multi-select';
          }
          else if(newField.filter.type === 'date-range'){
            newField.table.type = 'date';
          }

          template.fields.push(newField);

          template.explodeFields = [];
          template.fields.forEach(function (field){
            if(field.table.type === 'agg'){
              template.explodeFields.push(field.name);
            }
          });

          // Update form if it has an id
          if (template._id) {
            //FormResource.delete({id: template._id, type:'form', index: 'form"'}, onSuccess);
            var templateId = template._id;
            delete template._id;

            FormResource.update({ id: templateId }, template, function(onSuccess){
              LocaleResource.get({ size: 99 }, function (response) {
                //var locale = response.results[0]._source;
                var toLocale;
                var fromLocale;
                var toLng;

                var locales = response.results.reduce(function (locales, locale) {
                  if (locale._source.default) {
                    fromLocale = locale._source;
                  }

                  if (!toLocale && (!fromLocale || locale._source.lng !== fromLocale.lng)) {
                    toLocale = locale._source;
                    toLng = toLocale.lng;
                  }

                  locales[locale._source.lng] = locale._source;
                  locales[locale._source.lng]._id = locale._id;
                  return locales;
                }, {});

                fromLocale.translation.op[scope.data.newFieldName.split(' ').join('')] = scope.data.newFieldName;

                var localeId = fromLocale._id;

                delete fromLocale._id;


                LocaleResource.update({id: localeId}, fromLocale, function(response){
                  scope.closeModal();
                  $window.location.reload();
                  $window.onbeforeunload = function() {
                    window.scrollTo(0, 0);
                  }
                });
              });
            });
            //FormResource.save(template, onSuccess);
          }
          // create/save a new site form
          else {
            FormResource.save(template, function(onSuccess){
              LocaleResource.get({ size: 99 }, function (response) {
                //var locale = response.results[0]._source;
                var toLocale;
                var fromLocale;
                var toLng;

                var locales = response.results.reduce(function (locales, locale) {
                  if (locale._source.default) {
                    fromLocale = locale._source;
                  }

                  if (!toLocale && (!fromLocale || locale._source.lng !== fromLocale.lng)) {
                    toLocale = locale._source;
                    toLng = toLocale.lng;
                  }

                  locales[locale._source.lng] = locale._source;
                  locales[locale._source.lng]._id = locale._id;
                  return locales;
                }, {});

                fromLocale.translation.op[scope.data.newFieldName.split(' ').join('')] = scope.data.newFieldName;

                var localeId = fromLocale._id;

                delete fromLocale._id;

                LocaleResource.update({id: localeId}, fromLocale, function(response){
                  scope.closeModal();
                  $window.location.reload();
                  $window.onbeforeunload = function() {
                    window.scrollTo(0, 0);
                  }
                });
              });
            });
          }


        };

        scope.closeModal = function () {
          modalInstance.dismiss('cancel');
        };
      }]
    });
  };

$scope.openDeleteFieldModal = function (field) {

    return $modal.open({
      template: require('./config-delete-field.html'),
      backdrop: 'static',
      field: field,
      controller: ['$scope', '$modalInstance', function (scope, modalInstance) {
        scope.noValues = false;
        scope.data = {};
        scope.field = field;

        scope.delete = function (form) {

          //POST /resource/form/{id}/_update {field:name other:attributes}
          $scope.siteTemplate.name = 'site';
          var template = angular.copy($scope.siteTemplate);

          _.remove(template.fields, {
            name: scope.field.name
          });

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
            FormResource.update({ id: templateId }, template, function(onSuccess){
              scope.closeModal();
              $window.location.reload();
              $window.onbeforeunload = function() {
                window.scrollTo(0, 0);
              }

            });
            //FormResource.save(template, onSuccess);
          }
          // create/save a new site form
          else {
            FormResource.save(template, function(onSuccess){
              scope.closeModal();
              $window.location.reload();
              $window.onbeforeunload = function() {
                window.scrollTo(0, 0);
              }
            });

          }
        };

        scope.closeModal = function () {
          modalInstance.dismiss('cancel');
        };
      }]
    });
  };

  init();
};
