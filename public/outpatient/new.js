'use strict';

var angular = require('angular');
var controllers = require('../scripts/modules').controllers;
var services = require('../scripts/modules').services;

angular.module(controllers.name).controller('OutpatientNewCtrl', /*@ngInject*/ function($scope, $q, FormResource) {

  function getOutpatientForm() {
    // perform some asynchronous operation, resolve or reject the promise when appropriate.
    return $q(function(resolve, reject) {
      setTimeout(function() {
        FormResource.get({
          size: 1,
          q: 'name:site'
        }, function(response) {
          if (response.results.length === 0) {
            reject("No configured forms");
            throw new Error('No configured forms');
          } else {
            resolve(response.results[0]._source);
          }
        });
      }, 1000);
    });
  }
  $scope.formDataLoaded = false;
  var promise = getOutpatientForm();

  promise.then(function(result) {
    $scope.form = result;
    $scope.formDataLoaded = true;
    console.log($scope.form);
  }, function(reason) {
    alert('Failed: ' + reason);
  });

});
