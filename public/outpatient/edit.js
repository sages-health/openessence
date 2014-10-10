'use strict';

var angular = require('angular');
var controllers = require('../scripts/modules').controllers;
var services = require('../scripts/modules').services;

/**
 * Wraps an outpatientForm in a modal window.
 */
angular.module(services.name).factory('outpatientEditModal', /*@ngInject*/ function ($modal) {
  return {
    open: function (options) {
      options = angular.extend({
        template: require('./modal-edit.html'),
        controller: /*@ngInject*/ function ($scope, $modalInstance, record) {
          $scope.record = record;
          $scope.page = 1;

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

  $scope.editVisit = function (visit) {
    // TODO pass edit modal the form so it doesn't have to re-fetch
    outpatientEditModal.open({record: visit}).result
      .then(function () {
        reload();
        // TODO highlight record that was modified
      });
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

  });
});
