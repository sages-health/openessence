'use strict';

var angular = require('angular');
var d3 = require('d3');
var directives = require('../scripts/modules').directives;

angular.module(directives.name).directive('outpatientPieChart', function (gettextCatalog, outpatientAggregation,
                                                                          visualization, OutpatientVisit, $timeout,
                                                                          $rootScope) {
  return {
    restrict: 'E',
    template: require('./pie-chart.html'),
    scope: {
      options: '=?',
      width: '=?',
      height: '=?',
      queryString: '=',
      filters: '=',
      pivot: '=',
      aggData: '='
    },
    compile: function () {
      return {
        pre: function (scope, element) {
          scope.options = scope.options || {};

          var color = d3.scale.category20();

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
           * Return a 'g' element in the SVG for drawing the Pie
           * @param svgWidth
           * @param svgHeight
           * @returns g
           */
          var getSVG = function (svgWidth, svgHeight) {
            var svg = d3.select(element[0])
              .select('svg.pie-chart');

            if (svg.select('g.pie').empty()) {
              return svg.attr('width', svgWidth)
                .attr('height', svgHeight)
                .style({
                  'width': svgWidth,
                  'height': svgHeight
                })
                .append('g')
                .attr('class', 'pie')
                .attr('transform', function () {
                  var x = svgWidth / 2;
                  var y = svgHeight / 2;
                  return 'translate(' + x + ',' + y + ')';
                });
            } else {
              svg.attr('width', svgWidth)
                .attr('height', svgHeight)
                .style({
                  'width': svgWidth,
                  'height': svgHeight
                });
              return svg.select('g.pie')
                .attr('transform', function () {
                  var x = svgWidth / 2;
                  var y = svgHeight / 2;
                  return 'translate(' + x + ',' + y + ')';
                });
            }
          };

          /**
           * Lightens the color (clr) by the percent (0-1) provided
           * Taken from http://stackoverflow.com/questions/5560248/programmatically-lighten-or
           * -darken-a-hex-color-or-rgb-and-blend-colors
           * @param clr
           * @param percent
           * @returns {string}
           */
          var shadeColor = function (clr, percent) {
            var f=parseInt(clr.slice(1),16),t=percent<0?0:255,
              p=percent<0?percent*-1:percent,R=f>>16,G=f>>8&0x00FF,B=f&0x0000FF;
            return "#"+(0x1000000+(Math.round((t-R)*p)+R)*0x10000+(Math.round((t-G)*p)+G)*0x100+(Math.round((t-B)*p)+B))
              .toString(16).slice(1);
          };

          /**
           * Show a tooltip for d
           * @param d
           * @param arc
           * @param svgWidth
           * @param svgHeight
           */
          var showTooltip = function (d, arc, svgWidth, svgHeight) {
            var tooltipHTML = '<div class="colorcircle" style="float: left; margin-top: 6px; background-color: ' + d._color + ';"></div>';
            tooltipHTML += '<b>' + getName(d.data) + '</b></br>';
            tooltipHTML += d.value;
            element.append('<div class="timeseries_tooltip">' + tooltipHTML + '</div>');
            element.find('.timeseries_tooltip')
              .css({
                'top': arc.centroid(d)[1] + svgHeight / 2,
                'left': arc.centroid(d)[0] + svgWidth / 2
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
                type: data.col,
                value: data.colName
              };
              $rootScope.$emit('filterChange', filter, true, true);
            }
            if (data.row) {
              filter = {
                type: data.row,
                value: data.rowName
              };
              $rootScope.$emit('filterChange', filter, true, true);
            }
          };

          /**
           * Return the point on the edge of the cirlce that is in the middle
           * of the arc specified by the starting and ending radians
           * @param startRad
           * @param endRad
           * @returns array
           */
          var getEdgePoint = function(startRad, endRad, radius) {
            var extConstant = radius;
            var halfPi = Math.PI / 2;
            var x = extConstant * Math.cos((endRad + startRad) / 2 - halfPi);
            var y = extConstant * Math.sin((endRad + startRad) / 2 - halfPi);
            return [x, y];
          };

          /**
           * Transition each text element to its appropriate position
           * @param selection
           */
          var transformText = function (selection, radius) {
            selection.transition().attr('x', function (d) {
              return getEdgePoint(d.startAngle, d.endAngle, radius)[0];
            }).attr('y', function (d) {
              return getEdgePoint(d.startAngle, d.endAngle, radius)[1];
            });
          };

          /**
           * Assigns each text element an anchor based on its location (angle)
           * around the circle
           * @param selection
           * @returns selection
           */
          var assignTextAnchor = function (selection) {
            selection.style('text-anchor', function (d) {
              // d3 radians start at top not right side
              var angle = (d.startAngle + d.endAngle) / 2;
              if (angle >= 0 && angle < (11 / 12) * Math.PI) {
                return 'start';
              } else if (angle >= (5 / 6) * Math.PI && angle < (7 / 6) * Math.PI) {
                return 'middle';
              } else {
                return 'end';
              }
            });
            return selection;
          };

          /**
           * Gives the text element a dy value if necessary
           * to move it away from the edge of the graph.
           * This is mostly necessary for elements at the bottom of
           * the pie
           * @param selection
           * @returns selection
           */
          var textDy = function (selection) {
            selection.attr('dy', function (d) {
              var angle = (d.startAngle + d.endAngle) / 2;
              if (angle >= (5 / 6) * Math.PI && angle < (7 / 6) * Math.PI) {
                return '1em';
              } else {
                return '';
              }
            });
            return selection;
          };

          /**
           * Gives the text element a dx value if necessary
           * to move it away from the edge of the graph.
           * This is mostly necessary for elements at the right of
           * the pie
           * @param selection
           * @returns selection
           */
          var textDx = function (selection) {
            selection.attr('dx', function (d) {
              var angle = (d.startAngle + d.endAngle) / 2;
              if (angle > (1 / 6) * Math.PI && angle < (1 / 2) * Math.PI) {
                return '1em';
              } else {
                return '';
              }
            });
            return selection;
          };

          /**
           * Give each text element a text value
           * @param selection
           */
          var assignText = function (selection) {
            var minRadianToDisplay = 0.1;
            selection.text(function (d) {
              if (d.endAngle - d.startAngle < minRadianToDisplay) {
                return '';
              } else {
                return getName(d.data);
              }
            });
          };

          /**
           * Give the labels any necessary CSS
           * @param selection
           */
          var styleLabels = function (selection) {
            selection.style('fill', 'black');
          };

          /**
           * Detects and corrects label collisions
           * Calls itself until all collisions are resolved
           * This method can slow the visualization down and more optimization may be necessary.
           * Taken from:
           * http://blog.safaribooksonline.com/2014/03/11/solving-d3-label-placement-constraint-relaxing/
           * @param textLabels
           */
          var relaxLabels = function (textLabels) {
            var spacing = 14;
            var alpha = 1;
            var again = false;
            textLabels.each(function () {
              var a = this;
              var da = d3.select(this);
              var y1 = da.attr('y');

              if (da.text().length === 0) {
                return;
              }
              textLabels.each(function () {
                var b = this;
                if (a === b) {
                  return;
                }
                var db = d3.select(b);

                if (db.text().length === 0) {
                  return;
                }

                // If the text anchors aren't the same, they are on diff sides (no x value overlap)
                if (da.attr('text-anchor') !== db.attr('text-anchor')) {
                  return;
                }

                var y2 = db.attr('y');
                var deltaY = y1 - y2;
                if (Math.abs(deltaY) > spacing) {
                  return;
                }

                again = true;
                var sign = deltaY < 0 ? -1 : 1;
                var adjust = sign * alpha;
                da.attr('y', +y1 + adjust);
                db.attr('y', +y2 - adjust);
              });
              if (again) {
                $timeout(function () {
                  relaxLabels(textLabels);
                }, 20);
              }
            });
          };

          /**
           * Reload and redraw the Pie Chart
           */
          var reload = function () {
            // Width and height of the svg (larger than pie to leave room for labels)
            // Width is assumed from the parent element
            var svgWidth = scope.width || scope.options.width || 500,
              svgHeight = scope.height || scope.options.height || 400;

            // Width and height of the pie chart
            var chartWidth = Math.max(svgWidth - 100, 150),
              chartHeight = Math.max(svgHeight - 100, 150),
              radius = Math.min(chartWidth, chartHeight) / 2;

            var arc = d3.svg.arc()
              .outerRadius(radius - 10)
              .innerRadius(0);

            var pie = d3.layout.pie()
              .sort(null)
              .value(function (d) { return d.value; });

            var svg = getSVG(svgWidth, svgHeight);

            var data = svg.selectAll('.arc')
              .data(pie(scope.aggData), function (d) {
                return getName(d.data);
              })
              .each(function (d) {
                this._current = d;
              });
            data.exit().remove();
            var g = data.enter().append('g')
              .attr('class', 'arc');

            // data
            data.style('fill', function (d, i) {
                return color(i % 20);
              }).each(function (d, i) {
                d._shadeColor = shadeColor(color(i % 20), 0.25);
                d._color = color(i % 20);
              })
              .on('mouseover', function (d) {
                d3.select(this)
                  .transition()
                  .duration(175)
                  .style('fill', function () {
                    return d._shadeColor;
                  });
                showTooltip(d, arc, svgWidth, svgHeight);
              });

            data.select('path').transition().attr('d', arc).attrTween('d', function (a) {
              var i = d3.interpolate(this._current, a);
              this._current = i(0);
              return function (t) {
                return arc(i(t));
              };
            });

            data.select('path').style('fill', function (d) {
              return d._color;
            });

            g.append('path')
              .attr('d', arc)
              .on('mouseover', function (d) {
                d3.select(this)
                  .transition()
                  .duration(175)
                  .style('fill', function () {
                    return d._shadeColor;
                  });
                showTooltip(d, arc, svgWidth, svgHeight);
              })
              .on('mouseout', function (d) {
                d3.select(this)
                  .transition()
                  .duration(175)
                  .style('fill', d._color);
                hideTooltip();
              })
              .on('click', function (d) {
                narrowFilters(d.data);
              })
              .each(function (d) {
                this._current = d;
              })
              .style({
                'stroke': 'white',
                'stroke-rendering': 'crispEdges'
              });

            var prevText = data.select('text');
            transformText(prevText, radius);
            assignTextAnchor(prevText);
            textDy(prevText);
            textDx(prevText);
            assignText(prevText);

            var text = g.append('text');
            transformText(text, radius);
            assignTextAnchor(text);
            textDy(text);
            textDx(text);
            assignText(text);
            styleLabels(text);

            var textLabels = d3.select(element[0]).selectAll('text');
            relaxLabels(textLabels);
          };

          scope.$watchCollection('[aggData]', function () {
            reload();
          });

          scope.$watchCollection('[width, height]', function () {
            reload();
          });
        }
      };
    }
  };
});
