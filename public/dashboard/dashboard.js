'use strict';

var angular = require('angular');
var directives = require('../scripts/modules').directives;

angular.module(directives.name).directive('dashboard', function (gettextCatalog, $modal, visualization, Dashboard, $location) {
  return {
    restrict: 'E',
    template: require('./dashboard.html'),
    scope: {
      dashboardId: '=?'
    },
    compile: function () {
      return {
        pre: function (scope) {
          scope.gridsterOptions = {
            margins: [10, 10],
            columns: 50,
            draggable: {
              enabled: true
            },
            resizable: {
              enabled: true
            }
          };

          var getDaysDifference = function (start, end){
            var date1 = new Date(start);
            var date2 = new Date(end);
            var timeDiff = Math.abs(date2.getTime() - date1.getTime());
            return Math.ceil(timeDiff / (1000 * 3600 * 24));
          };

          //set dashboard data and make the date window rolling
          if (scope.dashboardId) {
            Dashboard.get(scope.dashboardId, function (data) {
              scope.dashboard = data._source;
              var anonymous = function (f) {
                return f.type === 'date-range';
              };
              for (var i =0; i < scope.dashboard.widgets.length; i++) {
                scope.dateFilters = scope.dashboard.widgets[i].content.filters.filter(anonymous);
                scope.interval = getDaysDifference(scope.dateFilters[0].from, scope.dateFilters[0].to);
                var now = new Date();
                now.setDate(now.getDate() - scope.interval);
                var start = now;
                var end = new Date();
                scope.dashboard.widgets[i].content.filters.from = start;
                scope.dashboard.widgets[i].content.filters.to = end;
              }
            });
          } else {
            scope.dashboard = {
              name: '',
              widgets: []
            };
          }

          scope.addWidget = function () {
            // TODO we don't need a modal with a single field
            $modal.open({
              template: require('./add-widget.html'),
              controller: ['$scope', '$modalInstance', function ($scope, $modalInstance) {
                // TODO this will only bring back 10 visualizations, we need paging
                visualization.resource.get(function (visualizations) {
                  $scope.visualizations = visualizations.results;
                });
                $scope.widget = {};

                $scope.cancel = function () {
                  $modalInstance.dismiss('cancel');
                };

                $scope.submit = function (form) {
                  // grab name and url
                  if (form.$invalid) {
                    $scope.yellAtUser = true;
                    return;
                  }
                  $modalInstance.close({
                    visualization: $scope.visualizations.filter(function (viz) {
                      return viz._id === $scope.widget.visualization;
                    })[0]._source
                  });
                };
              }]
            }).result.then(function (widget) {
                // create widget with name and visualization
                scope.dashboard.widgets.push({
                  name: widget.visualization.name,
                  sizeX: 10,
                  sizeY: 10,
                  content: widget.visualization.state
                });
              });
          };
          scope.clear = function () {
            scope.dashboard.widgets = [];
          };

          scope.export = function () {
            if (scope.dashboardId) {
              Dashboard.update(Dashboard.state(scope.dashboard), scope.dashboardId);
            } else {
              Dashboard.save(Dashboard.state(scope.dashboard));
            }
          };

          scope.clickthrough = function (widget) {
            var savedWidget = {};
            savedWidget[widget.name] = widget.content;
            sessionStorage.setItem('visualization', JSON.stringify(savedWidget));
            $location.path('/workbench').search('visualization', widget.name);
          };
        }
      };
    }
  };
});
