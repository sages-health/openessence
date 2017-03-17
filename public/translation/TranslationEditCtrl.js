'use strict';

var angular = require('angular');
var flat = require('flat');
// @ngInject
module.exports = function ($scope, $modal, $window, $filter, LocaleResource, NgTableParams) {

  var init = function () {
    LocaleResource.get({size: 99}, function (response) {

      $scope.locales = response.results.reduce(function (locales, locale) {
        if (locale._source.default) {
          $scope.fromLocale = locale._source;
        }

        if (!$scope.toLocale && (!$scope.fromLocale || locale._source.lng !== $scope.fromLocale.lng)) {
          $scope.toLocale = locale._source;
          $scope.toLng = $scope.toLocale.lng;
        }

        locales[locale._source.lng] = locale._source;
        locales[locale._source.lng]._id = locale._id;
        return locales;
      }, {});

    });

    $scope.tableParams = new NgTableParams({
      page: 1,            // show first page
      count: 100000,           // count per page
      sorting: {
        key: 'asc'     // initial sorting
      }
    }, {
      counts: [], // hide page count control
      getData: function (params) {
        var filteredData = params.filter() ?
                           $filter('filter')($scope.$data, params.filter()) :
                           $scope.$data;
        var orderedData = params.sorting() ?
                          $filter('orderBy')(filteredData, params.orderBy()) :
                          $scope.$data;

        if(angular.isDefined(orderedData)) {
          params.total(orderedData.length); // set total for recalc pagination
          return orderedData.slice((params.page() - 1) * params.count(), params.page() * params.count());
        }
      }
    });
  };

  var loadTranslation = function () {
    $scope.toLocale = $scope.locales[$scope.toLng];
    //flatten both json translation
    var from = $scope.locales[$scope.fromLocale.lng].translation;
    var fromFlat = flat.flatten(from);

    var to = $scope.locales[$scope.toLocale.lng] ? $scope.locales[$scope.toLocale.lng].translation : {};
    var toFlat = flat.flatten(to);

    var data = [];

    // merge to make one array
    angular.forEach(fromFlat, function (value, key) {
      var row = {};
      row.key = key;
      row.from = value;
      row.to = toFlat[key];
      data.push(row);
    });

    $scope.$data = data;
    $scope.tableParams.reload();
  };


  $scope.cancel = function () {
    // reload page
    $window.location.reload();
  };

  var openModal = function (title, message) {
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


  var openEditModal = function (row) {
    return $modal.open({
      template: require('./edit-modal.html'),

      controller: ['$scope', '$modalInstance', function ($scope, $modalInstance) {
        $scope.row = angular.copy(row);
        //$scope.data = {};
        $scope.save = function (form) {
          if (form.$invalid) {
            $scope.yellAtUser = true;
            return;
          }
          $modalInstance.close($scope.row);
        };
        $scope.closeModal = function () {
          $modalInstance.dismiss('cancel');
        };
      }]
    });
  };

  $scope.edit = function (row) {
    // open a modal to enter a new value
    openEditModal(row).result
      .then(function (newRow) {
        //TODO : update row on $scope.$data
        console.log(newRow);
        for(var i = 0; i < $scope.$data.length; i++){
          if($scope.$data[i].key === newRow.key){
            $scope.$data[i].to = newRow.to;
            $scope.tableParams.reload();
            break;
          }
        }
      });
  };

  $scope.save = function () {
    var onSuccess = function () {
      openModal('Success', 'Translation Saved').result
        .then(function () {
          // reload page to use new translation
          $window.location.reload();
        });
    };

    // Update form if it has an id
    if ($scope.toLocale._id) {
      var data = angular.copy($scope.$data);
      var translation = {};
      angular.forEach(data, function(d){
        if(angular.isDefined(d.to)) {
          translation[d.key] = d.to;
        }
      });
      $scope.toLocale.translation = flat.unflatten(translation);
      LocaleResource.update({id: $scope.toLocale._id}, $scope.toLocale, onSuccess);
    }
    // create/save a new site form
    else {
      openModal('Error', 'Could not save translation, locale ID missing!!!');
    }
  };

  $scope.$watch('toLng', function (newVals, oldVals) {

    // first time loading config page
    if (newVals === undefined && oldVals === undefined) {
      return;
    }

    loadTranslation();
  });

  init();
};
