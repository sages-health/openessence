'use strict';

var angular = require('angular');
var controllers = require('../modules').controllers;
var d3 = require('d3');

angular.module(controllers.name).controller('WorkbenchCtrl', function ($scope, $http, orderByFilter, FrableParams) {

  $scope.data = [];
  $scope.filters = {};

  // values copied from one of the nvd3 examples
  var values = [
    [1136005200000, 71],
    [1138683600000, 75],
    [1141102800000, 68],
    [1143781200000, 62],
    [1146369600000, 70],
    [1149048000000, 59],
    [1151640000000, 57],
    [1154318400000, 67],
    [1156996800000, 67],
    [1159588800000, 76],
    [1162270800000, 81],
    [1164862800000, 91],
    [1167541200000, 84],
    [1170219600000, 85],
    [1172638800000, 84],
    [1175313600000, 92],
    [1177905600000, 99],
    [1180584000000, 121],
    [1183176000000, 122],
    [1185854400000, 131],
    [1188532800000, 138],
    [1191124800000, 153],
    [1193803200000, 189],
    [1196398800000, 182],
    [1199077200000, 198],
    [1201755600000, 135],
    [1204261200000, 125],
    [1206936000000, 143],
    [1209528000000, 173],
    [1212206400000, 188],
    [1214798400000, 167],
    [1217476800000, 158],
    [1220155200000, 169],
    [1222747200000, 113],
    [1225425600000, 107],
    [1228021200000, 92],
    [1230699600000, 85],
    [1233378000000, 90],
    [1235797200000, 89],
    [1238472000000, 105],
    [1241064000000, 125],
    [1243742400000, 135],
    [1246334400000, 142],
    [1249012800000, 163],
    [1251691200000, 168],
    [1254283200000, 185],
    [1256961600000, 188],
    [1259557200000, 199],
    [1262235600000, 210],
    [1264914000000, 192],
    [1267333200000, 204],
    [1270008000000, 235],
    [1272600000000, 261],
    [1275278400000, 256],
    [1277870400000, 251],
    [1280548800000, 257],
    [1283227200000, 243],
    [1285819200000, 283],
    [1288497600000, 300],
    [1291093200000, 311],
    [1293771600000, 322],
    [1296450000000, 339],
    [1298869200000, 353],
    [1301544000000, 348],
    [1304136000000, 350],
    [1306814400000, 347],
    [1309406400000, 335],
    [1312084800000, 390],
    [1314763200000, 384],
    [1317355200000, 381],
    [1320033600000, 404],
    [1322629200000, 382],
    [1325307600000, 405],
    [1327986000000, 456],
    [1330491600000, 542],
    [1333166400000, 599],
    [1335758400000, 583]
  ];

  $http.get('/resources/outpatient-visit?size=500').success(function (rawData) {
    // TODO we need a real filter service like Kibana has
    // https://github.com/elasticsearch/kibana/blob/master/src/app/services/filterSrv.js
    var filterRawData = function () {
      return rawData.results
        .map(function (r) {
          return r._source;
        })
        .filter(function (row) {

          // nested comparison, based on https://github.com/angular/angular.js/pull/6215
          var compare = function (expected, actual) {
            if (expected === '') { // when filter not selected
              // TODO sometimes we do want to search for the empty string
              return true;
            }

            if (typeof expected === 'object') {
              if (typeof actual !== 'object') {
                return false;
              }

              for (var key in expected) {
                if (expected.hasOwnProperty(key)) {
                  if (!compare(expected[key], actual[key])) {
                    return false;
                  }
                }
              }

              return true;
            }

            return angular.equals(expected, actual);
          };

          // for each row, make sure every filter matches
          return Object.keys($scope.filters).every(function (filter) {
            var expected = {};
            expected[filter] = $scope.filters[filter];
            return compare(expected, row);
          });
        });
    };

    $scope.data = filterRawData();

    $scope.$watch('filters', function () {
      $scope.data = filterRawData();
    }, true);

    $scope.$watch('data', function () {
      $scope.tableParams.reload();
    }); // we always update the entire array reference, so no need for deep equality
  });

  $scope.tableParams = new FrableParams({
    page: 1,
    count: 10,
    sorting: {
      date: 'desc'
    }
  }, {
    total: function () {
      return $scope.data.length;
    },
    counts: [], // hide page count control
    $scope: {
      $data: {}
    },
    getData: function($defer, params) {
      var orderData = orderByFilter($scope.data, params.orderBy());
      $defer.resolve(orderData.slice((params.page() - 1) * params.count(), params.page() * params.count()));
    }
  });

  $scope.tsData = [
    {
      key: 'Males',
      bar: true,
      color: '#ccf',
      values: values.map(function (v) {
        // random percentage of cases are male
        return [v[0], v[1] * Math.random()];
      })
    },
    {
      key: 'Cough',
      color: '#333',
      values: values
    }
  ];

  $scope.xAxisTickFormat = function (d) {
    return d3.time.format('%x')(new Date(d));
  };
});
