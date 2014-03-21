/*!
 * Braph - Brian's graph.
 *
 * Based on angularjs-nvd3-directives's nvd3LinePlusBarChart directive
 * (http://cmaurer.github.io/angularjs-nvd3-directives) which are
 * Copyright (c) 2014 Christian Maurer; Licensed Apache License, v2.0
 */
'use strict';

var angular = require('angular');
var directives = require('../modules').directives;
var nv = require('nvd3');
var nvd3Utils = require('./nvd3Utils');

angular.module(directives.name).directive('braph', function () {
  return {
    restrict: 'EA',
    scope: {
      data: '=',
      width: '@',
      height: '@',
      id: '@',
      showlegend: '@',
      tooltips: '@',
      showxaxis: '@',
      showyaxis: '@',
      forceX: '@',
      forceY: '@',
      forceY2: '@',
      rightalignyaxis: '@',
      defaultstate: '@',
      nodata: '@',
      margin: '&',
      tooltipcontent: '&',
      color: '&',
      x: '&',
      y: '&',
      clipvoronoi: '@',
      interpolate: '@',
      callback: '&',
      xaxisorient: '&',
      xaxisticks: '&',
      xaxistickvalues: '&xaxistickvalues',
      xaxisticksubdivide: '&',
      xaxisticksize: '&',
      xaxistickpadding: '&',
      xaxistickformat: '&',
      xaxislabel: '@',
      xaxisscale: '&',
      xaxisdomain: '&',
      xaxisrange: '&',
      xaxisrangeband: '&',
      xaxisrangebands: '&',
      xaxisshowmaxmin: '@',
      xaxishighlightzero: '@',
      xaxisrotatelabels: '@',
      xaxisrotateylabel: '@',
      xaxisstaggerlabels: '@',
      xaxisaxislabeldistance: '@',
      y1axisorient: '&',
      y1axisticks: '&',
      y1axistickvalues: '&y1axistickvalues',
      y1axisticksubdivide: '&',
      y1axisticksize: '&',
      y1axistickpadding: '&',
      y1axistickformat: '&',
      y1axislabel: '@',
      y1axisscale: '&',
      y1axisdomain: '&',
      y1axisrange: '&',
      y1axisrangeband: '&',
      y1axisrangebands: '&',
      y1axisshowmaxmin: '@',
      y1axishighlightzero: '@',
      y1axisrotatelabels: '@',
      y1axisrotateylabel: '@',
      y1axisstaggerlabels: '@',
      y1axisaxislabeldistance: '@',
      y2axisorient: '&',
      y2axisticks: '&',
      y2axistickvalues: '&y2axistickvalues',
      y2axisticksubdivide: '&',
      y2axisticksize: '&',
      y2axistickpadding: '&',
      y2axistickformat: '&',
      y2axislabel: '@',
      y2axisscale: '&',
      y2axisdomain: '&',
      y2axisrange: '&',
      y2axisrangeband: '&',
      y2axisrangebands: '&',
      y2axisshowmaxmin: '@',
      y2axishighlightzero: '@',
      y2axisrotatelabels: '@',
      y2axisrotateylabel: '@',
      y2axisstaggerlabels: '@',
      y2axisaxislabeldistance: '@',
      legendmargin: '&',
      legendwidth: '@',
      legendheight: '@',
      legendkey: '@',
      legendcolor: '&',
      legendalign: '@',
      legendrightalign: '@',
      legendupdatestate: '@',
      legendradiobuttonmode: '@',
      objectequality: '@',
      transitionduration: '@'
    },
    controller: [
      '$scope',
      '$element',
      '$attrs',
      function ($scope, $element, $attrs) {
        $scope.d3Call = function (data, chart) {
          nvd3Utils.checkElementID($scope, $attrs, $element, chart, data);
        };
      }
    ],
    link: function (scope, element, attrs) {
      scope.$watch('data', function (data) {
        if (data) {
          //if the chart exists on the scope, do not call addGraph again, update data and call the chart.
          if (scope.chart) {
            return scope.d3Call(data, scope.chart);
          }
          nv.addGraph({
            generate: function () {
              nvd3Utils.initializeMargin(scope, attrs);
              var chart = nv.models.linePlusBarChart()
                .width(scope.width)
                .height(scope.height)
                .margin(scope.margin)
                .showLegend(attrs.showlegend === undefined ? false : attrs.showlegend === 'true')
                .tooltips(attrs.tooltips === undefined ? false : attrs.tooltips !== 'false')
                .noData(attrs.nodata === undefined ? 'No Data Available.' : scope.nodata)
                .interpolate(attrs.interpolate === undefined ? 'linear' : attrs.interpolate)
                .color(attrs.color === undefined ? nv.utils.defaultColor() : scope.color());

              if (attrs.x === undefined) {
                chart.x(function (d) {
                  return d[0];
                });
              } else {
                chart.x(scope.x());
              }

              if (attrs.y === undefined) {
                chart.y(function (d) {
                  return d[1];
                });
              } else {
                chart.y(scope.y());
              }

              if (attrs.forcex) {
                chart.lines.forceX(scope.$eval(attrs.forcex));
                chart.bars.forceX(scope.$eval(attrs.forcex));
              }
              if (attrs.forcey) {
                chart.lines.forceY(scope.$eval(attrs.forcey));
                chart.bars.forceY(scope.$eval(attrs.forcey));
              }
              if (attrs.tooltipcontent) {
                chart.tooltipContent(scope.tooltipcontent());
              }
              scope.d3Call(data, chart);
              nv.utils.windowResize(chart.update);
              scope.chart = chart;
              return chart;
            },
            callback: attrs.callback === undefined ? null : scope.callback()
          });
        }
      }, attrs.objectequality === undefined ? false : attrs.objectequality === 'true');

      if (!element.hasClass('braph')) {
        element.addClass('braph');
      }
    }
  };
});
