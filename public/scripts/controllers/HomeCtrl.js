'use strict';

var angular = require('angular');
var controllers = require('../modules').controllers;

angular.module(controllers.name).controller('HomeCtrl', function ($scope, FrableParams) {
  var data = [];
  for (var i = 0; i < 500; i++) {
    data[i] = {
      sex: ['Male', 'Female'][Math.floor(Math.random() * 2)],
      age: Math.floor(Math.random() * 100)
    };
  }

  $scope.tableParams = new FrableParams({
    page: 1,
    count: 10
  }, {
    total: data.length,
    counts: [], // hide page count control
    getData: function($defer, params) {
      $defer.resolve(data.slice((params.page() - 1) * params.count(), params.page() * params.count()));
    }
  });
});
