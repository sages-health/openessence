'use strict';

var angular = require('angular');
var d3 = require('d3');
var directives = require('../scripts/modules').directives;

angular.module(directives.name).directive('outpatientTimeSeries', /*@ngInject*/ function ($timeout, $window, gettextCatalog,
                                                                            outpatientAggregation, visualization,
                                                                            OutpatientVisitResource, scopeToJson) {
  return {
    restrict: 'E',
    template: require('./time-series.html'),
    scope: {
      options: '=?',
      height: '=?',
      width: '=?',
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
            visualization.save(angular.extend({}, scopeToJson(scope), {
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
                filterID: 'date',
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
            var bucket = agg.buckets || agg._name.buckets;
            return bucket.map(function (b) {
              /*jshint camelcase:false */
              var count = b.count ? b.count.value : b.doc_count;
              return [b.key, count];
            });
          };

          var plotSeries = function (seriesName, seriesType) {
            if (scope.filters) {
              var filters = scope.filters.filter(function (filter) {
                return filter.filterID === seriesType && filter.value.length > 0 &&
                  filter.value.indexOf(seriesName) === -1;
              });
              return filters.length === 0;
            }
            return true;
          };

          var reload = function () {
            var aggs = {};
            var dateAgg = {
              'date_histogram': {
                field: 'visitDate',
                interval: scope.interval,
                'min_doc_count': 0
              }
            };
            aggs.date = dateAgg;

            if (scope.series.length > 0) {
              aggs.date.aggs = {};
              scope.series.forEach(function (s) {
                aggs.date.aggs[s] = outpatientAggregation.getAggregation(s);
              });
            }

            OutpatientVisitResource.search({
              q: scope.queryString,
              size: 0, // we only want aggregations
              aggs: aggs
            }, function (data) {
              //expected scope.data = [ {aggKey, [ [dateMillis, count],.. ]},.. ]
              if (data.aggregations.date) {
                scope.data = [];
                var dataStore = {};

                if (scope.series && scope.series.length > 0) {
                  data.aggregations.date.buckets.map(function (d) {

                    scope.series.forEach(function (s) {
                      var buk = d[s].buckets || d[s]._name.buckets;
                      buk.map(function (entry) {
                        /*jshint camelcase:false */
                        // if we have filter on this field/series = s
                        // only plot series meeting filter criteria
                        if (plotSeries(entry.key, s)) {
                          var count = entry.count ? entry.count.value : entry.doc_count;
                          if (!dataStore[entry.key]) {
                            dataStore[entry.key] = [];
                          }
                          dataStore[entry.key].push([d.key, count]);
                        }
                      });
                    });
                  });
                  Object.keys(dataStore).forEach(function (k) {
                    scope.data.push({
                      key: k,
                      values: dataStore[k]
                    });
                  });
                } else {
                  scope.data = [
                    {
                      key: gettextCatalog.getString('Outpatient visits'),
                      values: extractCounts(data.aggregations.date)
                    }
                  ];
                }
              }
              scope.redraw(); // after new data is received, redraw timeseries
            });
          };

          /**
           * Called to get either the min or max of the x or y axes for the timeseries
           * @param data - the aggregation data
           * @param axis - 'x' or 'y'
           * @param extreme - 'min' or 'max'
           */
          var getAxisExtreme = function (data, axis, extreme) {
            if (!((axis !== 'x' || axis !== 'y') || (extreme !== 'min' || extreme !== 'max'))) {
              return null;
            }

            if (extreme === 'min') {
              return getMin(data, axis);
            } else {
              return getMax(data, axis);
            }
          };

          /**
           * Get the max for the specified axis from the aggregate data
           * @param data
           * @param axis
           * @returns max
           */
          var getMax = function (data, axis) {
            return d3.max(data, function (line) {
              return d3.max(line.values, function (point) {
                return +point[axis === 'x' ? 0 : 1];
              });
            });
          };

          /**
           * Get the min for the specified axis from the aggregate data
           * @param data
           * @param axis
           * @returns min
           */
          var getMin = function (data, axis) {
            return d3.min(data, function (line) {
              return d3.min(line.values, function (point) {
                return +point[axis === 'x' ? 0 : 1];
              });
            });
          };

          /**
           * Determine the format of the xaxis based on the interval
           * The xAxisType should be used to determine the formating of the labels
           * If domain is not null, then the scale should be ordinal
           *
           * In the future this method can be adapted to take into account
           * other factors besides the interval, such as whether the chart is a YoY for example
           * @param interval
           * @returns {{xAxisType: *, domain: *}}
           */
          var getXAxisDetails = function (interval) {
            // Decide what format the axis will be in
            // This affects the label formatting, and whether the scale is ordinal or linear
            var xAxisType;
            var domain;
            if (interval === 'day') {
              xAxisType = 'timestamp';
              domain = null;
            } else if (interval === 'week') {
              xAxisType = 'week';
              domain = null;
            } else if (interval === 'month') {
              xAxisType = 'month';
              domain = [
                gettextCatalog.getString('Jan'),
                gettextCatalog.getString('Feb'),
                gettextCatalog.getString('Mar'),
                gettextCatalog.getString('Apr'),
                gettextCatalog.getString('May'),
                gettextCatalog.getString('Jun'),
                gettextCatalog.getString('Jul'),
                gettextCatalog.getString('Aug'),
                gettextCatalog.getString('Sep'),
                gettextCatalog.getString('Oct'),
                gettextCatalog.getString('Nov'),
                gettextCatalog.getString('Dec')
              ];
            } else if (interval === 'quarter') {
              xAxisType = 'quarter';
              domain = null;
            } else if (interval === 'year') {
              xAxisType = 'year';
              domain = null;
            } else {
              xAxisType = null;
              domain = null;
            }
            return {
              xAxisType: xAxisType,
              domain: domain
            };
          };

          /**
           * Takes in a mouse event and returns an object with x and y properties.
           * This method ensure cross browser compatibility
           * for mouse events, which Firefox is making surprisingly difficult
           *
           * http://www.jacklmoore.com/notes/mouse-position/
           *
           * @param event
           */
          var getMouseCoords = function (event) {
            event = event || $window.event;

            if (event.offsetX) {
              return {
                x: event.offsetX,
                y: event.offsetY
              };
            }

            var target = event.target || event.srcElement,
              rect = target.getBoundingClientRect();

            return {
              x: event.clientX - rect.left + target.getBBox().x, // tailored to timeseries needs
              y: event.clientY - rect.top
            };
          };

          /**
           * Draw the mouse guideline at offsetX
           * @param chart
           * @param offsetX
           */
          var drawMouseGuide = function (chart, offsetX) {
            var guide = chart.selectAll('.mouseguide');
            if (guide.empty()) {
              guide = chart.append('line')
                  .attr('class', 'mouseguide');
            }
            guide.attr('x1', offsetX)
                .attr('x2', offsetX)
                .attr('y1', scope.timeseries.ymargin)
                .attr('y2', +chart.attr('height') - scope.timeseries.ymargin);
          };

          /**
           * Highlight all points on lines in the chart near offsetX
           * Return a key value set of highlighted pairs {lineIndex: yValue}
           * @param chart
           * @param offsetX
           * @returns {Object}
           */
          var highlightPoints = function (chart, offsetX) {
            var highlightedPairs = {};
            chart.selectAll('.highlightedDot').remove();
            angular.forEach(scope.data, function (pivot, pivotKey) {
              var minDistance = -1;
              var minKey = -1;
              angular.forEach(pivot.values, function (pair, pairKey) {
                var distance = Math.abs(scope.timeseries.xscale(pair[0]) - offsetX);
                if ((minDistance === -1 && distance < 10) || distance < minDistance) {
                  minDistance = distance;
                  minKey = pairKey;
                }
              });
              if (minKey !== -1) {
                highlightedPairs[pivotKey] = pivot.values[minKey];
                var x = scope.timeseries.xscale(pivot.values[minKey][0]);
                var y = scope.timeseries.yscale(pivot.values[minKey][1]);
                var circle = chart.select('.dot' + pivotKey);
                if (circle.empty()) {
                  circle = chart.append('circle')
                      .attr('class', 'highlightedDot dot' + pivotKey);
                }
                circle.attr('cx', x)
                    .attr('cy', y)
                    .attr('r', 4)
                    .style('fill', d3.scale.category20().range()[pivotKey % 20]);
              }
            });
            return highlightedPairs;
          };

          /**
           * Draw the tooltip for the specified chart based on nearby highlighted points
           * @param chart
           * @param offsetX
           * @param offsetY
           * @param highlightedPairs
           */
          var drawTooltip = function (chart, offsetX, offsetY, highlightedPairs) {
            var tooltipHtml = '';
            angular.forEach(Object.keys(highlightedPairs), function (index) {
              var pair = highlightedPairs[index];
              if (typeof pair[0] !== 'undefined') {
                if (tooltipHtml.length === 0) {
                  tooltipHtml += '<strong>' + scope.timeseries.xAxis.tickFormat()(pair[0]) + '</strong></br>';
                  tooltipHtml += '<table>';
                }
                tooltipHtml +=
                    '<tr><td><div class="colorcircle" style="background-color: ' + d3.scale.category20().range()[index % 20] + ';"></div></td>';
                tooltipHtml += '<td>' + scope.data[index].key + ':</td><td> ' + pair[1] + '</td></tr>';
              }
            });

            if (tooltipHtml.length > 0) {
              if (element.find('.timeseries_tooltip').length === 0) {
                element.find('.custom-timeseries')
                  .parent()
                  .append('<div class="timeseries_tooltip"></div>');
              }

              var ttHeight = element.find('.timeseries_tooltip')
                .html(tooltipHtml)
                .height();

              element.find('.timeseries_tooltip')
                .css({
                  top: offsetY - (ttHeight / 2),
                  left: offsetX + 40
                });
            } else {
              element.find('.timeseries_tooltip').remove();
            }
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
            var offsetX = getMouseCoords(event).x;
            var offsetY = getMouseCoords(event).y;

            // Use a timer to prevent cycling through all points a ridiculous amount of times
            if (scope.tsHoverTimer) {
              $timeout.cancel(scope.tsHoverTimer);
              scope.tsHoverTimer = null;
            }
            scope.tsHoverTimer = $timeout(function () {
              drawMouseGuide(chart, offsetX);
              var highlightedPairs = highlightPoints(chart, offsetX);
              drawTooltip(chart, offsetX, offsetY, highlightedPairs);
            }, 1);
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
            // Only zoom if mouse is down (drag) and interval is compatible with a date zoom
            if (scope.down) {//} && getXAxisDetails(scope.interval).domain === null) {
              d3.select(element[0]).selectAll('rect.highlight-rect').remove();
              scope.dragging = false;

              var offsetX = getMouseCoords(event).x;

              var startX = Math.min(scope.dragStartX, offsetX);
              var endX = Math.max(scope.dragStartX, offsetX);
              if (endX - startX > 5) {
                var revx = d3.scale.linear()
                  .domain([scope.timeseries.xmargin, scope.timeseries.width])
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
            var offsetX = getMouseCoords(event).x;
            if (!scope.dragging) {
              scope.dragStartX = offsetX;
            }
            d3.select(element[0]).selectAll('g.highlight-display rect.highlight-rect').remove();

            var width = offsetX - scope.dragStartX;
            var x = scope.dragStartX + (width < 0 ? width : 0);
            width = Math.abs(width);
            d3.select(element[0]).select('g.highlight-display')
              .attr('transform', 'translate(0, ' + scope.timeseries.legendHeight + ')')
              .append('svg:rect')
              .attr('class', 'highlight-rect')
              .attr('x', x)
              .attr('y', scope.timeseries.ymargin)
              .attr('width', width)
              .attr('height', scope.timeseries.height - 2 * scope.timeseries.ymargin);
            scope.dragging = true;
          };

          /**
           * Draw the timeseries graph
           */
          scope.redraw = function () {
            var data = scope.data;

            scope.timeseries = scope.timeseries || {};

            // Prevent catastrophic errors when dashboard doesn't set scope.data
            if (typeof data === 'undefined') {
              return;
            }

            var xAxisType = getXAxisDetails(scope.interval).xAxisType,
                domain = getXAxisDetails(scope.interval).domain;

            var xmin = getAxisExtreme(data, 'x', 'min'),
                xmax = getAxisExtreme(data, 'x', 'max'),
                ymin = getAxisExtreme(data, 'y', 'min'),
                ymax = getAxisExtreme(data, 'y', 'max');

            var height = scope.height || scope.options.height || scope.timeseries.height || 300;
            var width = scope.width || scope.options.width || scope.timeseries.width || element.find('.custom-timeseries').parent().width();
            var ymargin = 20;
            var xmargin = 40;

            var x = d3.scale.linear()
                .domain([xmin, xmax])
                .range([0 + xmargin, width]);

            var y = d3.scale.linear()
                .domain([0, ymax])
                .range([height - ymargin, 0 + ymargin]);

            var xAxis = d3.svg.axis()
                .scale(x)
                .orient('bottom')
                .tickFormat(function (d) {
                  // TODO: Use angular 3 beta's ISO time filters to make sure week numbers are accurate
                  if (xAxisType === 'timestamp') {
                    return d3.time.format('%Y-%m-%d')(new Date(d));
                  } else if (xAxisType === 'week') {
                    return ($window.parseInt(d3.time.format('%W')(new Date(d)))) + '-' + d3.time.format('%Y')(new Date(d));
                  } else if (xAxisType === 'month' && domain !== null) {
                    return domain[$window.parseInt(d3.time.format('%m')(new Date(d))) - 1] + ' ' + d3.time.format('%Y')(new Date(d));
                  } else if (xAxisType === 'quarter') {
                    return 'Q\'' + (Math.floor($window.parseInt(d3.time.format('%W')(new Date(d))) / 13) + 1) + '-' + d3.time.format('%Y')(new Date(d));
                  } else if (xAxisType === 'year') {
                    return d3.time.format('%Y')(new Date(d));
                  }
                })
                .innerTickSize(0)
                .ticks(5)
                .tickPadding(6);

            var yAxis = d3.svg.axis()
                .scale(y)
                .orient('left')
                .tickFormat(d3.format('d'))
                .innerTickSize(0)
                .tickPadding(6);

            var timeseries = d3.select(element[0]).select('.custom-timeseries');
            var g = timeseries.select('g.chart');
            var topLayer = timeseries.select('g.ts-top-layer');

            var yAxisLine = g.selectAll('.y.axis')
                .data(['y']);
            yAxisLine.exit().remove();
            yAxisLine.enter()
                .append('g')
                .attr('class', 'y axis')
                .attr('transform', 'translate(' + xmargin + ',' + '0' + ')')
                .call(yAxis);
            yAxisLine.transition()
                .call(yAxis)
                .attr('transform', 'translate(' + xmargin + ',' + '0' + ')');
            yAxisLine.selectAll('.gridline').remove();
            yAxisLine.selectAll('.tick')
                .append('line')
                .attr('class', 'gridline')
                .attr('x1', 0)
                .attr('y1', 0)
                .attr('x2', width - xmargin)
                .attr('y2', 0);

            var xAxisLine = g.selectAll('.x.axis')
                .data(['x']);
            xAxisLine.exit().remove();
            xAxisLine.enter()
                .append('g')
                .attr('class', 'x axis')
                .attr('transform', 'translate(0,' + (height - ymargin) + ')')
                .call(xAxis);
            xAxisLine.transition()
                .call(xAxis)
                .attr('transform', 'translate(0,' + (height - ymargin) + ')');
            xAxisLine.selectAll('.gridline').remove();
            xAxisLine.selectAll('.tick')
                .append('line')
                .attr('class', 'gridline')
                .attr('x1', 0)
                .attr('y1', 0)
                .attr('x2', 0)
                .attr('y2', -1 * (height - 2 * ymargin));

            var line = d3.svg.line()
                .x(function (d) {
                  return x(d[0]);
                })
                .y(function (d) {
                  return y(d[1]);
                })
                .defined(function (d) {
                  return !isNaN(d[1]);
                });

            var lines = g.selectAll('.pivotPath')
                .data(data, function (d) {
                  return d.key;
                });
            lines.exit().remove();
            lines.enter()
                .append('path')
                .attr('class', 'pivotPath')
                .attr('d', function (d) {
                  return line(d.values);
                })
                .style('stroke', function (d, i) {
                  return d3.scale.category20().range()[i % 20];
                });
            lines.transition().attr('d', function (d) {
              return line(d.values);
            });

            var currLegendWidth = 0;
            var currLegendRow = 0;
            var legend = timeseries.select('g.legend');
            var legendItems = legend.selectAll('.legendItem')
                .data(data, function (d) {
                  return d.key;
                });
            legendItems.exit().remove();
            var item = legendItems.enter()
                .append('g')
                .attr('class', 'legendItem');
            legend.selectAll('.legendItem')
                .attr('transform', function (d) {
              var wordWidth = d.key.length * 9 + 10,
                  oldLegendWidth = currLegendWidth;
              currLegendWidth += wordWidth;
              if (currLegendWidth > (width - xmargin)) {
                currLegendRow++;
                currLegendWidth = wordWidth;
                oldLegendWidth = 0;
              }
              return 'translate(' + (xmargin + oldLegendWidth) + ',' + ((currLegendRow + 1) * 15) +')';
            });
            item.append('text')
                .text(function (d) {
                  return d.key;
                })
                .attr('transform', 'translate(8, 0)');
            item.append('circle')
                .attr('cx', 0)
                .attr('cy', -5)
                .attr('r', 5)
                .style('fill', function (d, i) {
                  return d3.scale.category20().range()[i % 20];
                });

            var legendHeight = (currLegendRow + 1) * 15;

            timeseries.attr('width', width + xmargin)
                .attr('height', height + legendHeight);

            legend.attr('width', width)
                .attr('height', legendHeight)
                .attr('transform', 'translate(0, 0)');

            timeseries.select('g.chart')
                .attr('transform', 'translate(0, ' + legendHeight + ')')
                .attr('width', width + xmargin)
                .attr('height', height);

            topLayer.attr('transform', 'translate(0, ' + legendHeight + ')')
                .attr('width', width)
                .attr('height', height);

            topLayer.select('rect.mouse-detector')
                .attr('width', width - xmargin)
                .attr('height', height - 2 * ymargin)
                .attr('x', xmargin)
                .attr('y', ymargin);

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
              'xAxis': xAxis
            };
          };

          scope.$watchCollection('[series, queryString, interval]', function () {
            reload();
          });

          // No need to reload data
          scope.$watchCollection('[options.height, options.width]', function () {
            scope.redraw();
          });
        }
      };
    }
  };
});
