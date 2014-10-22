'use strict';

var angular = require('angular');
var d3 = require('d3');
var directives = require('../scripts/modules').directives;

angular.module(directives.name).directive('outpatientBarChart', /*@ngInject*/ function ($rootScope) {
  return {
    restrict: 'E',
    template: require('./bar-chart.html'),
    scope: {
      options: '=?',
      queryString: '=',
      filters: '=',
      pivot: '=',
      aggData: '='
    },
    compile: function () {
      return {
        pre: function (scope, element) {
          scope.options = scope.options || {};

          /**
           * Return a 'g' element in the SVG for drawing the Bar
           * @param svgWidth
           * @param svgHeight
           * @returns g
           */
          var getSVG = function (svgWidth, svgHeight) {
            var svg = d3.select(element[0])
              .select('svg.bar-chart');

            if (svg.select('g.bar').empty()) {
              return svg.attr('width', svgWidth)
                .attr('height', svgHeight)
                .style({
                  'width': svgWidth,
                  'height': svgHeight
                })
                .append('g')
                .attr('class', 'bar')
                .attr('transform', function () {
                  var x = 75;//svgWidth / 2;
                  var y = 25;//svgHeight / 2;
                  return 'translate(' + x + ',' + y + ')';
                });
            } else {
              svg.attr('width', svgWidth)
                .attr('height', svgHeight)
                .style({
                  'width': svgWidth,
                  'height': svgHeight
                });
              return svg.select('g.bar')
                .attr('transform', function () {
                  var x = 75;//svgWidth / 2;
                  var y = 25;//svgHeight / 2;
                  return 'translate(' + x + ',' + y + ')';
                });
            }
          };

          /**
           * Get the display name for the data point
           * Also used to match new data points to existing ones
           * @param data
           * @returns string
           */
          var getName = function (data) {
            if (data.colName && data.rowName) {
              return data.colName + '_' + data.rowName;
            } else {
              return data.colName || data.rowName;
            }
          };

          /**
           * Show a tooltip for d
           * @param d
           * @param arc
           * @param svgWidth
           * @param svgHeight
           */
          var showTooltip = function (d, context, coords) {
            hideTooltip();
            var tooltipHTML = '<div class="colorcircle"></div>';
            tooltipHTML += '<b>' + getName(d) + '</b><br>';
            tooltipHTML += d.value;
            element.append('<div class="timeseries_tooltip">' + tooltipHTML + '</div>');
            element.find('.timeseries_tooltip')
              .css({
                'top': coords[1],
                'left': coords[0]
              });
            element.find('.timeseries_tooltip .colorcircle')
              .css({
                'background-color': context._color
              });
          };

          /**
           * Hide all tooltips in the element
           */
          var hideTooltip = function () {
            element.find('.timeseries_tooltip').remove();
          };

          /**
           * Refine the workbench filters based on the data object
           * provided
           */
          var narrowFilters = function (data) {
            var filter;
            if (data.col) {
              filter = {
                filterID: data.col,
                value: data.colName
              };
              $rootScope.$emit('filterChange', filter, true, true);
            }
            if (data.row) {
              filter = {
                filterID: data.row,
                value: data.rowName
              };
              $rootScope.$emit('filterChange', filter, true, true);
            }
          };

          // http://bl.ocks.org/mbostock/3887051
          var redraw = function () {
            var svgWidth = scope.options.width || element.find('svg.bar-chart')[0].parentNode.offsetWidth,
              svgHeight = scope.options.height || 400;

            var chartWidth = svgWidth - 125,
              chartHeight = svgHeight - 100;

            var svg = getSVG(svgWidth, svgHeight);

            var data = scope.aggData;

            if (data.length === 0) {
              svg.selectAll('.g').remove();
              return;
            }

            var rowNames = [];
            for (var i = 0; i < data.length; i++) {
              if (data[i].values) {
                for (var j = 0; j < data[i].values.length; j++) {
                  if (data[i].values[j].rowName) {
                    if (rowNames.indexOf(data[i].values[j].rowName) === -1) {
                      rowNames.push(data[i].values[j].rowName);
                    }
                  }
                }
              }
            }
            if (rowNames.length === 0) {
              rowNames.push(undefined);
            }

            var legend = svg.select('g.legend');
            if (legend.empty()) {
              legend = svg.append('g')
                .attr('class', 'legend');
            }
            legend.selectAll('circle').remove();
            legend.selectAll('text').remove();
            var currLegendItemOffset = 0;
            var currLegendItemCol = 0;
            angular.forEach(rowNames, function (value, key) {
              if (typeof value === 'undefined') {
                return;
              }
              var color = d3.scale.category20().range()[key % 20];

              var text = legend.append('text')
                .attr('x', 0)
                .attr('y', 0)
                .text(value)
                .attr('text-anchor', 'left');

              var textWidth = text[0][0].getBBox().width;

              legend.append('circle')
                .attr('cx', currLegendItemOffset + 13)
                .attr('cy', 15 * currLegendItemCol + 5)
                .attr('r', 5)
                .style('fill', color);
              currLegendItemOffset += 20;

              text.attr('x', currLegendItemOffset);
              text.attr('y', 15 * currLegendItemCol + 10);

              currLegendItemOffset += textWidth;
              if (currLegendItemOffset >= chartWidth - 20) {
                currLegendItemOffset = 0;
                currLegendItemCol++;
              }
            });
            var legendHeight = (currLegendItemCol + 1) * 15 + 10;
            legend.attr('x', 0)
              .attr('y', 0)
              .attr('width', svgWidth)
              .attr('height', legendHeight);


            var x0 = d3.scale.ordinal()
              .rangeRoundBands([0, chartWidth], 1);

            var x1 = d3.scale.ordinal();

            var y = d3.scale.linear()
              .range([chartHeight, legendHeight]);

            var color = d3.scale.category20();

            var xAxis = d3.svg.axis()
              .scale(x0)
              .orient('bottom');

            var yAxis = d3.svg.axis()
              .scale(y)
              .orient('left')
              .tickFormat(d3.format('d'));

            var yMax = d3.max(data, function (d1) {
              return d3.max(d1.values, function (d2) {
                return d2.value;
              });
            });

            x0.domain(data.map(function (d) {
              return d.colName || d.key;
            })).rangeRoundBands([0, chartWidth], 0.1);

            x1.domain(rowNames).rangeRoundBands([0, x0.rangeBand()]);

            y.domain([0, yMax]);

            var xAxisText;
            if (svg.selectAll('.x.axis').empty()) {
              xAxisText = svg.append('g')
                .attr('class', 'x axis')
                .attr('transform', 'translate(0,' + chartHeight + ')')
                .call(xAxis)
                .selectAll('text');

            } else {
              xAxisText = svg.select('.x.axis').attr('transform', 'translate(0,' + chartHeight + ')')
                .call(xAxis)
                .selectAll('text');
            }

            // If xAxis has overlapping labels, rotate them 30 degrees
            var needRotation = false;
            xAxisText.each(function () {
              needRotation = this.getComputedTextLength() > x1.rangeBand() || needRotation;
            });

            if (needRotation) {
              xAxisText.attr('transform', 'rotate(-30)')
                .attr('text-anchor', 'end')
                .attr('x', '-1.5em')
                .style('stroke-rendering', 'crispEdges');
            } else {
              xAxisText.attr('transform', 'rotate(0)')
                .attr('text-anchor', 'middle')
                .attr('x', '0');
            }

            var yAxisTicks;
            if (svg.selectAll('.y.axis').empty()) {
              yAxisTicks = svg.append('g')
                .attr('class', 'y axis')
                .call(yAxis);

              yAxisTicks.selectAll('.tick')
                .append('svg:line')
                .attr('class', 'gridline')
                .attr('x1', 0)
                .attr('y1', 0)
                .attr('x2', function (d) {
                  if (d % 1 === 0) {
                    return chartWidth;
                  }
                  return 0;
                })
                .attr('y2', 0);
            } else {
              yAxisTicks = svg.selectAll('.y.axis').call(yAxis);
              yAxisTicks.selectAll('.tick.gridline').remove();
              yAxisTicks.selectAll('.tick')
                .append('svg:line')
                .attr('class', 'gridline')
                .attr('x1', 0)
                .attr('y1', 0)
                .attr('x2', function (d) {
                  if (d % 1 === 0) {
                    return chartWidth;
                  }
                  return 0;
                })
                .attr('y2', 0);
            }

            var col = svg.selectAll('.g')
              .data(data, function (d) {
                return getName(d) || d.key;
              });
            col.exit().remove();

            col.transition()
              .attr('transform', function (d) { return 'translate(' + x0(d.colName || d.key) + ',0)'; });

            col.enter().append('g')
              .attr('class', 'g')
              .attr('transform', function (d) { return 'translate(' + x0(d.colName || d.key) + ',0)'; });

            var rect = col.selectAll('rect')
              .data(function (d) {
                return d.values.filter(function (d1) {
                  return d1.value > 0;
                });
              });
            rect.exit().remove();

            rect.transition()
              .attr('width', function () {
                return Math.min(x1.rangeBand(), 80);
              })
              .attr('x', function (d) {
                var diff = x1.rangeBand() - Math.min(x1.rangeBand(), 80);
                return x1(d.rowName) + diff / 2;
              })
              .attr('y', function (d) { return y(d.value); })
              .attr('height', function(d) { return chartHeight - y(d.value); })
              .style('fill', function (d) { return color(d.rowName); })
              .each(function (d) {
                this._color = color(d.rowName);
              });

            rect.enter().append('rect')
              .attr('width', function () {
                return Math.min(x1.rangeBand(), 80);
              })
              .attr('x', function (d) {
                var diff = x1.rangeBand() - Math.min(x1.rangeBand(), 80);
                return x1(d.rowName) + diff / 2;
              })
              .attr('y', function (d) { return y(d.value); })
              .attr('height', function(d) { return chartHeight - y(d.value); })
              .style('fill', function (d) { return color(d.rowName); })
              .style('opacity', '.8')
              .each(function (d) {
                this._color = color(d.rowName);
              })
              .on('mousemove', function (d) {
                var coords = d3.mouse(this.parentElement.parentElement.parentElement); // meh this is hacky
                showTooltip(d, this, coords);
                d3.select(this)
                  .style('opacity', '1');
              })
              .on('mouseout', function () {
                hideTooltip();
                d3.select(this)
                  .style('opacity', 0.8);
              })
              .on('click', function (d) {
                narrowFilters(d);
              });
          };

          scope.$watchCollection('[aggData]', function () {
            redraw();
          });

          scope.$watchCollection('[options.width, options.height]', function () {
            redraw();
          });
        }
      };
    }
  };
});
