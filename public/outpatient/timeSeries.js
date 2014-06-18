'use strict';

var angular = require('angular');
var d3 = require('d3');
var directives = require('../scripts/modules').directives;

angular.module(directives.name).directive('outpatientTimeSeries', function (gettextCatalog, outpatientAggregation,
                                                                            visualization, OutpatientVisit) {
  return {
    restrict: 'E',
    template: require('./time-series.html'),
    scope: {
      options: '=?',
      queryString: '=',
      filters: '=',
      series: '=?' // array of strings denoting series to graph
    },
    compile: function () {
      return {
        pre: function (scope, element) {
          scope.options = scope.options || {};
          scope.series = scope.series || scope.options.series || [];

          scope.xAxisTickFormat = function (d) {
            return d3.time.format('%Y-%m-%d')(new Date(d));
          };

          scope.interval = scope.options.interval || 'day'; // TODO auto-select based on date range

          scope.$on('export', function () {
            visualization.save(angular.extend({}, visualization.state(scope), {
              visualization: {
                name: 'line'
              },
              pivot: {
                cols: scope.series
              }
            }));
          });

          /**
           *
           * @param factor zoom factor, 0.5 would cut timespan in half (zoom in), 2 would double timespan (zoom out)
           */
          scope.zoom = function (factor) {
            if (factor === 1) {
              // I wonder if this is even worth checking for
              return;
            }

            var dateFilters = scope.filters.filter(function (f) {
              return f.type === 'date-range';
            });

            var dateFilter;
            if (dateFilters.length === 0) {
              // TODO add new date filter
            } else {
              dateFilter = dateFilters[0];
            }

            if (!dateFilter && factor > 1) {
              // with no date filter, the time series is already at max zoom
              return;
            }

            // adapted from Kibana's algorithm,
            // see https://github.com/elasticsearch/kibana/blob/70ad6e27c137bf8f376e233d40c0c11385647625/src/app/panels/histogram/module.js#L510
            var timespan = dateFilter.to.getTime() - dateFilter.from.getTime();
            // TODO use endpoints of data instead, since they can't be undefined
            // TODO no way to get tick values from SVG we should just use d3 directly

            var center = dateFilter.to.getTime() - timespan / 2;
            var to = center + timespan * factor / 2;
            var from = center - timespan * factor / 2;

            // don't look into the future unless we already are
            if (to > Date.now() && dateFilter.to < Date.now()) {
              from = from - (to - Date.now());
              to = Date.now();
            }

            // When we first create a time series, it's OK if the x-axis limits are defined by the data, e.g. you
            // may run a query over a 90-day range, but only get back data in a 45-day interval. d3 adjusts the graph
            // accordingly, which is what you probably want to save space. But that auto-adjustment can be jarring
            // when you zoom out, e.g. the graph might not change at all if you zoom out and there's no new data to
            // show
            // FIXME this doesn't work, we'll probably have to use d3 directly
            scope.forceX = [from, to];

            if (factor > 1) {
              // replace existing date filter when we zoom out, action can be reversed by zooming in
              dateFilter.from = new Date(from);
              dateFilter.to = new Date(to);
            } else {
              // add a new filter we we zoom in, action can be reversed by deleting this new filter
              scope.filters.push({
                type: 'date',
                from: new Date(from),
                to: new Date(to)
              }); // TODO filter panel needs to watch for changes to filters
            }
          };

          /**
           * Zoom the graph to the specified date range
           * WARNING: It is an unchecked error to pass in an invalid date range
           *
           * @param from is the start date (i.e. x-axis minimum on the graph)
           * @param to is the end date (i.e. x-axis maximum on the graph)
           */
          scope.zoomWithRange = function (from, to) {
            var dateFilters = scope.filters.filter(function (f) {
              return f.type === 'date-range';
            });

            var dateFilter;
            if (dateFilters.length > 0) {
              dateFilter = dateFilters[0];
            }

            if (!dateFilter) {
              dateFilter = {
                filterId: 'date',
                from: new Date(from),
                to: new Date(to)
              };
              scope.filters.push(dateFilter);
              scope.$emit('filterChange', dateFilter, true);
            } else {
              dateFilter.from = new Date(from);
              dateFilter.to = new Date(to);
            }
          };

          var extractCounts = function (agg) {
            return agg.buckets.map(function (b) {
              /*jshint camelcase:false */
              return [b.key, b.doc_count];
            });
          };

          var reload = function () {
            var aggs = {};
            var dateAgg = {
              'date_histogram': {
                field: 'reportDate',
                interval: scope.interval
              }
            };

            if (scope.series.length > 0) {
              scope.series.forEach(function (s) {
                aggs[s] = outpatientAggregation.getAggregation(s);
                aggs[s].aggs = {
                  date: dateAgg
                };
              });
            } else {
              aggs.date = dateAgg;
            }

            OutpatientVisit.search({
              q: scope.queryString,
              size: 0, // we only want aggregations
              aggs: aggs
            }, function (data) {
              if (data.aggregations.date) {
                scope.data = [
                  {
                    key: gettextCatalog.getString('Outpatient visits'),
                    values: extractCounts(data.aggregations.date)
                  }
                ];
              } else {
                scope.data = [];
                Object.keys(data.aggregations).forEach(function (agg) {
                  // agg === 'sex', e.g.
                  data.aggregations[agg].buckets.map(function (b) {
                    scope.data.push({
                      key: outpatientAggregation.bucketToKey(b),
                      values: extractCounts(b.date)
                    });
                  });
                });
              }
              scope.redraw(); // after new data is received, redraw timeseries
            });
          };

          /**
           * Called on mousemove
           * Detect closest data points and draw a mouse guide, tooltip
           * and circles.
           * @param event
           */
          scope.timeSeriesHover = function (event) {
            if (scope.down) { // dragging
              scope.timeSeriesDrag(event);
            }
            var chart = d3.select(element[0]).select('g.chart');
            var guideX = -1;
            var highlightedPairs = [];

            chart.selectAll('circle.highlightedDot').remove();
            // for each pivot, find the closest point and draw a circle there
            angular.forEach(scope.data, function (pivot, pivotKey) {
              var minDistance = -1;
              var minKey = -1;
              angular.forEach(pivot.values, function (pair, pairKey) {
                var distance = Math.abs(scope.timeseries.xscale(pair[0]) - event.offsetX);
                if (minDistance === -1 || distance < minDistance) {
                  minDistance = distance;
                  minKey = pairKey;
                }
              });
              if (minKey !== -1) {
                highlightedPairs[pivotKey] = pivot.values[minKey];
                var x = scope.timeseries.xscale(pivot.values[minKey][0]);
                var y = scope.timeseries.yscale(pivot.values[minKey][1]);
                chart.append('svg:circle')
                  .attr('class', 'highlightedDot')
                  .attr('cx', x)
                  .attr('cy', -y)
                  .attr('r', 5)
                  .style('fill', scope.timeseries.palette[pivotKey]);
                guideX = guideX === -1 ? x : guideX;
              }
            });

            // draw the mouse guideline
            chart.selectAll('.mouseguide').remove();
            chart.append('svg:line')
              .attr('class', 'mouseguide')
              .attr('x1', guideX)
              .attr('y1', -1 * scope.timeseries.ymargin)
              .attr('x2', guideX)
              .attr('y2', -1 * (scope.timeseries.height - (scope.timeseries.ymargin)));

            // Create tooltip
            var tooltipHtml = '';
            angular.forEach(highlightedPairs, function (pair, index) {
              if (typeof pair[0] !== 'undefined') {
                if (index === 0) {
                  tooltipHtml += '<strong>' + readableDate(pair[0]) + '</strong></br>';
                  tooltipHtml += '<table>';
                }
                tooltipHtml +=
                  '<tr><td><div class="colorcircle" style="background-color: ' + scope.timeseries.palette[index] + ';"></div></td>';
                tooltipHtml += '<td>' + scope.data[index].key + ':</td><td> ' + pair[1] + '</td></tr>';
              }
            });

            angular.element('.timeseries_tooltip').remove();
            if (tooltipHtml.length > 0) {
              element.find('.custom-timeseries')
                .parent()
                .append('<div class="timeseries_tooltip"></div>');

              var ttHeight = element.find('.timeseries_tooltip')
                .html(tooltipHtml)
                .height();

              element.find('.timeseries_tooltip')
                .css({
                  'top': event.offsetY - (ttHeight / 2),
                  'left': guideX + 40
                });
            }
          };

          /**
           * Called on mouseout from timeseries
           * Removes the mouseguide, tooltip and any highlighted dots
           */
          scope.timeSeriesLeave = function () {
            var chart = d3.select(element[0]).select('g.chart');
            chart.selectAll('.mouseguide').remove();
            chart.selectAll('.custom-timeseries circle.highlightedDot').remove();
            element.find('.timeseries_tooltip').remove();
          };

          /**
           * Called onmousedown on the chart
           * Sets scope.down as true for left clicks only
           * @param event
           */
          scope.timeSeriesMouseDown = function (event) {
            if (event.which === 1) {
              scope.down = true;
            }
          };

          /**
           * Called on mouseup after a drag (highlight zoom)
           * Converts coords to dates and calls scope.zoomWithRange
           * @param event
           */
          scope.timeSeriesZoomIn = function (event) {
            if (scope.down) {
              d3.select(element[0]).selectAll('rect.highlight-rect').remove();
              scope.dragging = false;

              var startX = Math.min(scope.dragStartX, event.offsetX);
              var endX = Math.max(scope.dragStartX, event.offsetX);
              if (endX - startX > 5) {
                var revx = d3.scale.linear()
                  .domain([scope.timeseries.xmargin, scope.timeseries.width - scope.timeseries.xmargin])
                  .range([scope.timeseries.xmin, scope.timeseries.xmax]);
                var fromDate = new Date(revx(startX));
                var toDate = new Date(revx(endX));

                scope.zoomWithRange(fromDate, toDate);
              }
            }
            scope.down = false;
          };

          /**
           * Called on mousemove after a mousedown
           * Draws the highlight box and stores the starting drag point
           * @param event
           */
          scope.timeSeriesDrag = function (event) {
            if (!scope.dragging) {
              scope.dragStartX = event.offsetX;
            }
            d3.select(element[0]).selectAll('g.highlight-display rect.highlight-rect').remove();

            var width = event.offsetX - scope.dragStartX;
            var x = scope.dragStartX + (width < 0 ? width : 0);
            width = Math.abs(width);
            var transformY = scope.timeseries.yscale(scope.timeseries.ymax) + scope.timeseries.legendHeight + 5;
            d3.select(element[0]).select('g.highlight-display')
              .attr('transform', 'translate(0, ' + transformY + ')') //5 so labels aren't cut off
              .append('svg:rect')
              .attr('class', 'highlight-rect')
              .attr('x', x)
              .attr('y', -1 * (scope.timeseries.height - scope.timeseries.ymargin))
              .attr('width', width)
              .attr('height', scope.timeseries.height - 2 * scope.timeseries.ymargin);
            scope.dragging = true;
          };

          /**
           * Return a string "YYYY-MM-DD" based on the parameter
           * @param millis is the time since epoch
           * @returns {string}
           */
          var readableDate = function (millis) {
            var date = new Date(millis);
            var month = date.getUTCMonth() + 1; // currently universal time. Remove UTC for local?
            var day = date.getUTCDate();
            var year = date.getUTCFullYear();
            return (year + '-' + month + '-' + day);
          };

          /**
           * Draw the timeseries graph
           */
          scope.redraw = function () {
            var data = scope.data;

            var dateFilters = scope.filters.filter(function (f) {
              return f.type === 'date-range';
            });

            var dateFilter = dateFilters[0];
            if (dateFilter) {
              if (angular.isString(dateFilter.from)) {
                dateFilter.from = new Date(dateFilter.from);
              }

              if (angular.isString(dateFilter.to)) {
                dateFilter.to = new Date(dateFilter.to);
              }
            }

            // Pick correct date range. Using filter date and extremes in data
            var xmin1 = d3.min(data, function (pivot) {
              return d3.min(pivot.values, function (datum) {
                return +datum[0];
              });
            });

            var xmin2 = (dateFilter && dateFilter.from) ? dateFilter.from.getTime() : 0;
            if (typeof xmin1 === 'undefined') {
              xmin1 = xmin2;
            }

            var xmax1 = d3.max(data, function (pivot) {
              return  d3.max(pivot.values, function (datum) {
                return +datum[0];
              });
            });

            var xmax2 = (dateFilter && dateFilter.to) ? dateFilter.to.getTime() : 0;
            if (typeof xmax1 === 'undefined') {
              xmax1 = xmax2;
            }

            var xmin = (xmin2 < xmin1 && xmin2 !== 0) ? xmin2 : xmin1;
            var xmax = Math.max(xmax1, xmax2);

            // Get Y range, default is (0,1) if no maxes or mins
            var ymin = d3.min(data, function (pivot) {
              return d3.min(pivot.values, function (datum) {
                return +datum[1];
              });
            });

            var ymax = d3.max(data, function (pivot) {
              return d3.max(pivot.values, function (datum) {
                return +datum[1];
              });
            });

            if (typeof ymin === 'undefined') {
              ymin = 0;
            }
            if (typeof ymax === 'undefined') {
              ymax = ymin + 1;
            }

            // Set time series dimensions
            var height = 300;
            var width = element.find('.custom-timeseries').parent().width();
            var ymargin = 20;
            var xmargin = 40;

            // Get the width of the longest Y label
            element.append('<div class="str_width">' + ymax + '</div>');
            var yLabelWidth = angular.element('.str_width').width();
            element.find('.str_width').remove();

            // Get the width of half of an x label in case it is longer than a full Y label (leftmost x sticks out)
            element.append('<div class="str_width">' + readableDate(xmin) + '</div>');
            var xLabelHalf = angular.element('.str_width').width();
            element.find('.str_width').remove();
            xLabelHalf /= 2;

            xmargin = 5 + Math.max(yLabelWidth, xLabelHalf); // 5 extra for padding

            var x = d3.scale.linear()
              .domain([xmin, xmax])
              .range([0 + xmargin, width - xmargin]);
            var y = d3.scale.linear()
              .domain([0, ymax])
              .range([0 + ymargin, height - ymargin]);

            var timeseries = d3.select(element[0]).select('.custom-timeseries');
            var g = timeseries.select('g.chart');
            var topLayer = timeseries.select('g.ts-top-layer');

            g.selectAll('path').remove();
            g.selectAll('circle.point').remove();
            g.selectAll('line').remove();
            g.selectAll('text').remove();

            // Can't use default ticks because we don't want decimal numbers
            // Logic to get between ~4 and 10 whole numbered increments that make sense to a human
            var yrange = ymax - ymin;
            var desiredMinNumTicks = 4;
            var tickRange = yrange / desiredMinNumTicks;
            var log10 = Math.floor((tickRange < Math.E ? 0 : Math.log(tickRange)) / 2.303) + 1;
            var yLabelIncrement = Math.pow(10, log10 - 1) * (1 + Math.floor(tickRange / Math.pow(10, log10)));
            yLabelIncrement *= Math.pow(2, Math.floor(ymax / (10 * yLabelIncrement)));

            // Y labels and guidelines
            var yLabelValue = 0;
            while (yLabelValue < ymax && ymax >= 0) {
              g.append('svg:text')
                .attr('class', 'yLabel')
                .text(yLabelValue)
                .attr('x', xmargin - yLabelWidth - 2)
                .attr('y', -1 * y(yLabelValue) + 5) // center labels vertically
                .attr('text-anchor', 'left');
              g.append('svg:line')
                .attr('class', 'yTicks guide')
                .attr('y1', -1 * y(yLabelValue))
                .attr('x1', xmargin)
                .attr('y2', -1 * y(yLabelValue))
                .attr('x2', width - xmargin);
              yLabelValue += yLabelIncrement;
            }
            // Special label for max
            g.append('svg:text')
              .attr('class', 'yLabel')
              .text(ymax)
              .attr('x', xmargin - yLabelWidth - 2)
              .attr('y', -1 * y(ymax) + 5)
              .attr('text-anchor', 'left');

            // Logic to pick the number of x ticks
            var xTickPadding = 20; // in pixels
            var numTicks = Math.floor(width / ((2 * xLabelHalf) + xTickPadding));
            // Add starting x tick
            g.append('svg:text')
              .attr('class', 'xLabel')
              .text(readableDate(xmin))
              .attr('x', x(xmin))
              .attr('y', 0)
              .attr('text-anchor', 'middle');
            // Add middle x ticks and guides
            for (var i = 0; i < numTicks; i++) {
              var xcoord = x(Math.floor(i * ((xmax - xmin) / numTicks)) + xmin);
              g.append('svg:text')
                .attr('class', 'xLabel')
                .text(readableDate(Math.floor(i * ((xmax - xmin) / numTicks)) + xmin))
                .attr('x', xcoord)
                .attr('y', 0)
                .attr('text-anchor', 'middle');
              g.append('svg:line')
                .attr('class', 'xTicks guide')
                .attr('x1', xcoord)
                .attr('y1', -ymargin)
                .attr('x2', xcoord)
                .attr('y2', -1 * (height - ymargin));
            }
            // Ending x tick
            g.append('svg:text')
              .attr('class', 'xLabel')
              .text(readableDate(xmax))
              .attr('x', x(xmax)) // 2
              .attr('y', 0)
              .attr('text-anchor', 'middle');

            // Axis
            g.append('svg:line')
              .attr('x1', xmargin)
              .attr('y1', 0 - ymargin)
              .attr('x2', width - xmargin)
              .attr('y2', 0 - ymargin);

            g.append('svg:line')
              .attr('x1', xmargin)
              .attr('y1', 0 - ymargin)
              .attr('x2', xmargin)
              .attr('y2', -1 * y(ymax));

            var paletteInUse = [];
            var legend = timeseries.select('g.legend');
            legend.selectAll('circle').remove();
            legend.selectAll('text').remove();
            var currLegendItemOffset = 0;
            var currLegendItemCol = 0;

            // For each pivot, pick a color, draw a line, add it to the legend
            angular.forEach(data, function (value, key) {
              var color;
              color = d3.scale.category20().range()[key % 20];
              paletteInUse.push(color);

              var line = d3.svg.line()
                .x(function (d) {
                  return x(d[0]);
                })
                .y(function (d) {
                  return -1 * y(d[1]);
                }).defined(function (d) {
                  return !isNaN(d[1]);
                });
              // Graph
              g.append('svg:path')
                .attr('class', 'path' + key)
                .attr('d', line(value.values));

              // If only 1 data point. Draw point
              if (value.values.length === 1) {
                var xcoord = x(value.values[0][0]);
                var ycoord = -1 * y(value.values[0][1]);
                g.append('svg:circle')
                  .attr('class', 'point')
                  .attr('cx', xcoord)
                  .attr('cy', ycoord)
                  .attr('r', 3)
                  .style({
                    'fill': color
                  });

              }

              // Legend Elements
              var text = legend.append('svg:text')
                .attr('x', 0)
                .attr('y', 0)
                .text(value.key)
                .attr('text-anchor', 'left');

              var textWidth = text[0][0].getBBox().width;

              legend.append('svg:circle')
                .attr('cx', currLegendItemOffset + 13 + xmargin)
                .attr('cy', -15 * currLegendItemCol - 15)
                .attr('r', 5)
                .style('fill', color);
              currLegendItemOffset += 20;

              text.attr('x', currLegendItemOffset + xmargin);
              text.attr('y', -15 * currLegendItemCol - 10);

              currLegendItemOffset += textWidth;
              if (currLegendItemOffset >= width - (2 * xmargin)) {
                currLegendItemOffset = 0;
                currLegendItemCol++;
              }

              angular.element('.custom-timeseries g .path' + key).css({
                'stroke': color,
                'stroke-width': 2,
                'fill': 'none'
              });
            });

            var legendHeight = (currLegendItemCol + 1) * 15 + 10;

            timeseries.attr('width', width)
              .attr('height', height + legendHeight);

            legend.attr('width', width)
              .attr('height', legendHeight)
              .attr('transform', 'translate(0, ' + legendHeight + ')');

            timeseries.select('g.chart')
              .attr('transform', 'translate(0, ' + (y(ymax) + 5 + legendHeight) + ')') //5 so labels aren't cut off
              .attr('width', width)
              .attr('height', height);

            topLayer.attr('transform', 'translate(0, ' + (y(ymax) + 5 + legendHeight) + ')') //5 so labels aren't cut off
              .attr('width', width)
              .attr('height', height);

            topLayer.select('rect.mouse-detector')
              .attr('width', width - xmargin)
              .attr('height', height - 2 * ymargin)
              .attr('x', xmargin)
              .attr('y', -(height - ymargin));

            // Save info in scope for use by zoom etc.
            scope.timeseries = {
              'xmin': xmin,
              'xmax': xmax,
              'ymin': ymin,
              'ymax': ymax,
              'legendHeight': legendHeight,
              'height': height,
              'width': width,
              'ymargin': ymargin,
              'xmargin': xmargin,
              'xscale': x,
              'yscale': y,
              'palette': paletteInUse
            };
          };

          scope.$watchCollection('[series, queryString, interval]', function () {
            reload();
          });
        }
      };
    }
  };
});
