'use strict';

var angular = require('angular');
var controllers = require('../scripts/modules').controllers;
var services = require('../scripts/modules').services;

/**
 * Wraps an outpatientForm in a modal window.
 */
angular.module(services.name).factory('outpatientEditModal', /*@ngInject*/ function ($modal) {
  return {
    open: function (scope, modalOptions) { // TODO fix all usages of this
      modalOptions = angular.extend({
        template: require('./modal-edit.html'),
        controller: /*@ngInject*/ function ($scope, $modalInstance) {
          angular.extend($scope, {
            page: 1
          }, scope);

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
            $modalInstance.close();
          };

          $scope.next = function () {
            $scope.$broadcast('next-page');
          };

          $scope.previous = function () {
            $scope.$broadcast('previous-page');
          };

        }
      }, modalOptions);

      return $modal.open(modalOptions);
    }
  };
});

angular.module(services.name).factory('outpatientDeleteModal', /*@ngInject*/ function ($modal, OutpatientVisitResource) {
  return {
    open: function (options) {
      options = angular.extend({
        template: require('../partials/delete-record.html'),
        controller: /*@ngInject*/ function ($scope, $modalInstance, record) {
          $scope.record = record;

          $scope.delete = function () {
            OutpatientVisitResource.remove({id: record._id}, function () {
              $modalInstance.close(record);
            });
          };
          $scope.cancel = function () {
            $modalInstance.dismiss('cancel');
          };
        },
        resolve: {
          record: function () {
            return options.record;
          }
        }
      }, options);

      return $modal.open(options);
    }
  };
});

angular.module(controllers.name).controller('OutpatientEditCtrl', /*@ngInject*/ function ($scope, $modal, outpatientEditModal,
                                                                            gettextCatalog, outpatientDeleteModal,
                                                                            possibleFilters, FormResource) {
  $scope.activeFilters = [
    angular.extend({
      filterID: 'visitDate'
      // no to/from window, we page the results anyway
    }, possibleFilters.visitDate)
  ];

  $scope.createVisit = function () {
    outpatientEditModal.open().result
      .then(function () {
        reload();
        // TODO highlight record that was created
      });
  };

  var reload = function () {
    $scope.$broadcast('outpatientReload');
  };

  $scope.deleteVisit = function (visit) {
    outpatientDeleteModal.open({record: visit}).result
      .then(function () {
        reload();
      });
  };

  $scope.$on('outpatientEdit', function (event, visit) {
    $scope.editVisit(visit);
  });

  $scope.$on('outpatientDelete', function (event, visit) {
    $scope.deleteVisit(visit);
  });

  // TODO form can be quite large (>20KB for demo) since it includes every possible value for dropdowns
  // that's probably not an issue for most sites collecting a handful of diagnoses at a few sites,
  // but could be an issue for sites collecting a lot of symptoms, diagnoses, etc.
  // "Correct" solution would involve linking to other resources and then fetching them on demand, e.g.
  // returning JSON HAL and then querying for dropdown values as needed. In the meantime, at least it's cached.
  FormResource.get({size: 1, q: 'name:demo'}, function (response) {
    if (response.results.length === 0) {
      throw new Error('No configured forms');
    }

    var form = response.results[0]._source;
    $scope.form = form; // need to pass to visualizations

    $scope.possibleFilters = form.fields.reduce(function (filters, field) {
      if (!field.enabled) {
        return filters;
      }

      var possibleFilter = possibleFilters[field.name];
      if (possibleFilter) {
        filters[field.name] = angular.extend({values: field.values}, possibleFilters[field.name]);
      }

      return filters;
    }, {});

    $scope.editVisit = function (visit) {
      outpatientEditModal.open({record: visit, form: form}).result
        .then(function () {
          reload();
          // TODO highlight record that was modified
        });
    };
  });
});
