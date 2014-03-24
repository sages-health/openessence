'use strict';
/**
 * frable: A table widget for fracas.
 *
 * Based on ngTable:
 * @author Vitalii Savchuk <esvit666@gmail.com>
 * @url https://github.com/esvit/ng-table/
 * @license New BSD License <http://creativecommons.org/licenses/BSD/>
 */

var angular = require('angular');

var app = angular.module('frable', []);

// TODO get rid of this and have clients just use regular JS object ala ng-grid
app.factory('FrableParams', ['$q', '$log', function ($q, $log) {
  var isNumber = function (n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
  };
  return function (baseParameters, baseSettings) {
    var self = this,
      log = function () {
        if (settings.debugMode && $log.debug) {
          $log.debug.apply(this, arguments);
        }
      };

    this.data = [];

    /**
     * @ngdoc method
     * @name frable.factory:FrableParams#parameters
     * @methodOf frable.factory:FrableParams
     * @description Set new parameters or get current parameters
     *
     * @param {string} newParameters      New parameters
     * @param {string} parseParamsFromUrl Flag if parse parameters like in url
     * @returns {Object} Current parameters or `this`
     */
    this.parameters = function (newParameters, parseParamsFromUrl) {
      parseParamsFromUrl = parseParamsFromUrl || false;
      if (angular.isDefined(newParameters)) {
        for (var key in newParameters) {
          var value = newParameters[key];
          if (parseParamsFromUrl && key.indexOf('[') >= 0) {
            var keys = key.split(/\[(.*)\]/).reverse();
            var lastKey = '';
            for (var i = 0, len = keys.length; i < len; i++) {
              var name = keys[i];
              if (name !== '') {
                var v = value;
                value = {};
                value[lastKey = name] = (isNumber(v) ? parseFloat(v) : v);
              }
            }
            if (lastKey === 'sorting') {
              params[lastKey] = {};
            }
            params[lastKey] = angular.extend(params[lastKey] || {}, value[lastKey]);
          } else {
            params[key] = (isNumber(newParameters[key]) ? parseFloat(newParameters[key]) : newParameters[key]);
          }
        }
        log('frable: set parameters', params);
        return this;
      }
      return params;
    };

    /**
     * @ngdoc method
     * @name frable.factory:FrableParams#settings
     * @methodOf frable.factory:FrableParams
     * @description Set new settings for table
     *
     * @param {Object} newSettings New settings or undefined
     * @returns {Object} Current settings or `this`
     */
    this.settings = function (newSettings) {
      if (angular.isDefined(newSettings)) {
        if (angular.isArray(newSettings.data)) {
          //auto-set the total from passed in data
          newSettings.total = newSettings.data.length;
        }
        settings = angular.extend(settings, newSettings);
        log('frable: set settings', settings);
        return this;
      }
      return settings;
    };

    /**
     * @ngdoc method
     * @name frable.factory:FrableParams#page
     * @methodOf frable.factory:FrableParams
     * @description If parameter page not set return current page else set current page
     *
     * @param {string} page Page number
     * @returns {Object|Number} Current page or `this`
     */
    this.page = function (page) {
      return angular.isDefined(page) ? this.parameters({'page': page}) : params.page;
    };

    /**
     * @ngdoc method
     * @name frable.factory:FrableParams#total
     * @methodOf frable.factory:FrableParams
     * @description If parameter total not set return current quantity else set quantity
     *
     * @param {string} total Total quantity of items
     * @returns {Object|Number} Current page or `this`
     */
    this.total = function (total) {
      if (angular.isDefined(total)) {
        return this.settings({total: total});
      }

      if (angular.isFunction(settings.total)) {
        return settings.total();
      } else {
        return settings.total;
      }
    };

    /**
     * @ngdoc method
     * @name frable.factory:FrableParams#count
     * @methodOf frable.factory:FrableParams
     * @description If parameter count not set return current count per page else set count per page
     *
     * @param {string} count Count per number
     * @returns {Object|Number} Count per page or `this`
     */
    this.count = function (count) {
      // reset to first page because can be blank page
      return angular.isDefined(count) ? this.parameters({'count': count, 'page': 1}) : params.count;
    };

    /**
     * @ngdoc method
     * @name frable.factory:FrableParams#filter
     * @methodOf frable.factory:FrableParams
     * @description If parameter page not set return current filter else set current filter
     *
     * @param {string} filter New filter
     * @returns {Object} Current filter or `this`
     */
    this.filter = function (filter) {
      return angular.isDefined(filter) ? this.parameters({'filter': filter}) : params.filter;
    };

    /**
     * @ngdoc method
     * @name frable.factory:FrableParams#sorting
     * @methodOf frable.factory:FrableParams
     * @description If 'sorting' parameter is not set, return current sorting. Otherwise set current sorting.
     *
     * @param {string} sorting New sorting
     * @returns {Object} Current sorting or `this`
     */
    this.sorting = function (sorting) {
      if (arguments.length === 2) {
        var sortArray = {};
        sortArray[sorting] = arguments[1];
        this.parameters({'sorting': sortArray});
        return this;
      }
      return angular.isDefined(sorting) ? this.parameters({'sorting': sorting}) : params.sorting;
    };

    /**
     * @ngdoc method
     * @name frable.factory:FrableParams#isSortBy
     * @methodOf frable.factory:FrableParams
     * @description Checks sort field
     *
     * @param {string} field     Field name
     * @param {string} direction Direction of sorting 'asc' or 'desc'
     * @returns {boolean} Return true if field sorted by direction
     */
    this.isSortBy = function (field, direction) {
      return angular.isDefined(params.sorting[field]) && params.sorting[field] === direction;
    };

    /**
     * @ngdoc method
     * @name frable.factory:FrableParams#orderBy
     * @methodOf frable.factory:FrableParams
     * @description Return object of sorting parameters for angular filter
     *
     * @returns {Array} Array like: [ '-name', '+age' ]
     */
    this.orderBy = function () {
      var sorting = [];
      for (var column in params.sorting) {
        sorting.push((params.sorting[column] === 'asc' ? '+' : '-') + column);
      }
      return sorting;
    };

    /**
     * @ngdoc method
     * @name frable.factory:FrableParams#getData
     * @methodOf frable.factory:FrableParams
     * @description Called when updated some of parameters for get new data
     *
     * @param {Object} $defer promise object
     * @param {Object} params New parameters
     */
    this.getData = function ($defer, params) {
      if (angular.isArray(this.data) && angular.isObject(params)) {
        $defer.resolve(this.data.slice((params.page() - 1) * params.count(), params.page() * params.count()));
      } else {
        $defer.resolve([]);
      }
    };

    /**
     * @ngdoc method
     * @name frable.factory:FrableParams#getGroups
     * @methodOf frable.factory:FrableParams
     * @description Return groups for table grouping
     */
    this.getGroups = function ($defer, column) {
      var defer = $q.defer();

      defer.promise.then(function (data) {
        var groups = {};
        angular.forEach(data, function (item) {
          var groupName = angular.isFunction(column) ? column(item) : item[column];

          groups[groupName] = groups[groupName] || {
            data: []
          };
          groups[groupName].value = groupName;
          groups[groupName].data.push(item);
        });
        var result = [];
        for (var i in groups) {
          result.push(groups[i]);
        }
        log('frable: refresh groups', result);
        $defer.resolve(result);
      });
      this.getData(defer, self);
    };

    /**
     * @ngdoc method
     * @name frable.factory:FrableParams#generatePagesArray
     * @methodOf frable.factory:FrableParams
     * @description Generate array of pages
     *
     * @param {number} currentPage which page must be active
     * @param {number} totalItems  Total quantity of items
     * @param {number} pageSize    Quantity of items on page
     * @returns {Array} Array of pages
     */
    this.generatePagesArray = function (currentPage, totalItems, pageSize) {
      var maxBlocks, maxPage, maxPivotPages, minPage, numPages, pages;
      maxBlocks = 7; // ng-table defaults to 11, which is a little too big for us
      pages = [];
      numPages = Math.ceil(totalItems / pageSize);
      if (numPages > 1) {
        pages.push({
          type: 'prev',
          number: Math.max(1, currentPage - 1),
          disabled: currentPage <= 1
        });
        pages.push({
          type: 'first',
          number: 1,
          active: currentPage === 1
        });
        maxPivotPages = Math.round((maxBlocks - 5) / 2);
        minPage = Math.max(2, currentPage - maxPivotPages);
        maxPage = Math.min(numPages - 1, currentPage + maxPivotPages * 2 - (currentPage - minPage));
        minPage = Math.max(2, minPage - (maxPivotPages * 2 - (maxPage - minPage)));
        var i = minPage;
        while (i <= maxPage) {
          if ((i === minPage && i !== 2) || (i === maxPage && i !== numPages - 1)) {
            pages.push({
              type: 'more', // AKA the ... segment that indicates there are more pages not shown
              disabled: true // ... is never clickable
            });
          } else {
            pages.push({
              type: 'page',
              number: i,
              active: currentPage === i
            });
          }
          i++;
        }
        pages.push({
          type: 'last',
          number: numPages,
          active: currentPage === numPages
        });
        pages.push({
          type: 'next',
          number: Math.min(numPages, currentPage + 1),
          disabled: currentPage >= numPages
        });
      }
      return pages;
    };

    /**
     * @ngdoc method
     * @name frable.factory:FrableParams#url
     * @methodOf frable.factory:FrableParams
     * @description Return groups for table grouping
     *
     * @param {boolean} asString flag indicates return array of string or object
     * @returns {Array} If asString = true will be return array of url string parameters else key-value object
     */
    this.url = function (asString) {
      asString = asString || false;
      var pairs = (asString ? [] : {});
      for (var key in params) {
        if (params.hasOwnProperty(key)) {
          var item = params[key],
            name = encodeURIComponent(key);
          if (typeof item === 'object') {
            for (var subkey in item) {
              if (!angular.isUndefined(item[subkey]) && item[subkey] !== '') {
                var pname = name + '[' + encodeURIComponent(subkey) + ']';
                if (asString) {
                  pairs.push(pname + '=' + item[subkey]);
                } else {
                  pairs[pname] = item[subkey];
                }
              }
            }
          } else if (!angular.isFunction(item) && !angular.isUndefined(item) && item !== '') {
            if (asString) {
              pairs.push(name + '=' + encodeURIComponent(item));
            } else {
              pairs[name] = encodeURIComponent(item);
            }
          }
        }
      }
      return pairs;
    };

    /**
     * @ngdoc method
     * @name frable.factory:FrableParams#reload
     * @methodOf frable.factory:FrableParams
     * @description Reload table data
     */
    this.reload = function () {
      var $defer = $q.defer(),
        self = this;

      settings.$loading = true;
      if (settings.groupBy) {
        settings.getGroups($defer, settings.groupBy, this);
      } else {
        settings.getData($defer, this);
      }
      log('frable: reload data');
      $defer.promise.then(function (data) {
        settings.$loading = false;
        log('frable: current scope', settings.$scope);
        if (settings.groupBy) {
          self.data = settings.$scope.$groups = data;
        } else {
          self.data = settings.$scope.$data = data;
        }
        settings.$scope.pages = self.generatePagesArray(self.page(), self.total(), self.count());
      });
    };

    this.reloadPages = function () {
      var self = this;
      settings.$scope.pages = self.generatePagesArray(self.page(), self.total(), self.count());
    };

    var params = this.$params = {
      page: 1,
      count: 1,
      filter: {},
      sorting: {},
      group: {},
      groupBy: null
    };
    var settings = {
      $scope: null, // set by Frable controller
      $loading: false,
      data: null, //allows data to be set when table is initialized
      total: 0,
      defaultSort: 'desc',
      filterDelay: 750,
      counts: [10, 25, 50, 100],
      getGroups: this.getGroups,
      getData: this.getData
    };

    this.settings(baseSettings);
    this.parameters(baseParameters, true);
    return this;
  };
}]);

/**
 * @ngdoc object
 * @name frable.directive:frable.FrableController
 *
 * @description
 * Each {@link frable.directive:frable frable} directive creates an instance of `FrableController`
 */
var FrableController = ['$scope', 'FrableParams', '$q', function ($scope, FrableParams) {
  $scope.$loading = false;

  if (!$scope.params) {
    $scope.params = new FrableParams();
  }
  $scope.params.settings().$scope = $scope;

  var delayFilter = (function () {
    var timer = 0;
    return function (callback, ms) {
      clearTimeout(timer);
      timer = setTimeout(callback, ms);
    };
  })();

  $scope.$watch('params.$params', function (newParams, oldParams) {
    $scope.params.settings().$scope = $scope;

    if (!angular.equals(newParams.filter, oldParams.filter)) {
      delayFilter(function () {
        $scope.params.$params.page = 1;
        $scope.params.reload();
      }, $scope.params.settings().filterDelay);
    } else {
      $scope.params.reload();
    }
  }, true);

  $scope.sortBy = function (column, event) {
    var parsedSortable = $scope.parse(column.sortable);
    if (!parsedSortable) {
      return;
    }
    var defaultSort = $scope.params.settings().defaultSort;
    var inverseSort = (defaultSort === 'asc' ? 'desc' : 'asc');
    var sorting = $scope.params.sorting() && $scope.params.sorting()[parsedSortable] && ($scope.params.sorting()[parsedSortable] === defaultSort);
    var sortingParams = (event.ctrlKey || event.metaKey) ? $scope.params.sorting() : {};
    sortingParams[parsedSortable] = (sorting ? inverseSort : defaultSort);
    $scope.params.parameters({
      sorting: sortingParams
    });
  };
}];

/**
 * @ngdoc directive
 * @name frable.directive:frable
 * @restrict A
 *
 * @description
 * Directive that instantiates {@link frable.directive:frable.FrableController FrableController}.
 */
app.directive('frable', ['$compile', '$q', '$parse', function ($compile, $q, $parse) {
  return {
    restrict: 'A',
    priority: 1001,
    scope: true,
    controller: FrableController,
    compile: function (element) {
      var columns = [], i = 0, row = null;

      // custom header
      var thead = element.find('thead');

      // IE 8 fix :not(.frable-group) selector
      angular.forEach(angular.element(element.find('tr')), function (tr) {
        tr = angular.element(tr);
        if (!tr.hasClass('frable-group') && !row) {
          row = tr;
        }
      });
      if (!row) {
        return;
      }
      angular.forEach(row.find('td'), function (item) {
        var el = angular.element(item);
        if (el.attr('ignore-cell') && 'true' === el.attr('ignore-cell')) {
          return;
        }
        var parsedAttribute = function (attr, defaultValue) {
          return function (scope) {
            return $parse(el.attr('x-data-' + attr) || el.attr('data-' + attr) || el.attr(attr))(scope, {
              $columns: columns
            }) || defaultValue;
          };
        };

        var parsedTitle = parsedAttribute('title', ' '),
          headerTemplateURL = parsedAttribute('header', false),
          filter = parsedAttribute('filter', false)(),
          filterTemplateURL = false,
          filterName = false;

        if (filter && filter.$$name) {
          filterName = filter.$$name;
          delete filter.$$name;
        }
        if (filter && filter.templateURL) {
          filterTemplateURL = filter.templateURL;
          delete filter.templateURL;
        }

        el.attr('data-title-text', parsedTitle()); // this used in responsive table
        columns.push({
          id: i++,
          title: parsedTitle,
          sortable: parsedAttribute('sortable', false),
          'class': el.attr('x-data-header-class') || el.attr('data-header-class') || el.attr('header-class'),
          filter: filter,
          filterTemplateURL: filterTemplateURL,
          filterName: filterName,
          headerTemplateURL: headerTemplateURL,
          filterData: (el.attr('filter-data') ? el.attr('filter-data') : null),
          show: (el.attr('ng-show') ? function (scope) {
            return $parse(el.attr('ng-show'))(scope);
          } : function () {
            return true;
          })
        });
      });
      return function (scope, element, attrs) {
        scope.$loading = false;
        scope.$columns = columns;

        scope.$watch(attrs.frable, function (params) {
          if (angular.isUndefined(params)) {
            return;
          }
          scope.paramsModel = $parse(attrs.frable);
          scope.params = params;
        }, true);
        scope.parse = function (text) {
          return angular.isDefined(text) ? text(scope) : '';
        };
        if (attrs.showFilter) {
          scope.$parent.$watch(attrs.showFilter, function (value) {
            scope.showFilter = value;
          });
        }
        angular.forEach(columns, function (column) {
          var def;
          if (!column.filterData) {
            return;
          }
          def = $parse(column.filterData)(scope, {
            $column: column
          });
          if (!(angular.isObject(def) && angular.isObject(def.promise))) {
            throw new Error('Function ' + column.filterData + ' must be instance of $q.defer()');
          }
          delete column.filterData;
          return def.promise.then(function (data) {
            if (!angular.isArray(data)) {
              data = [];
            }
            data.unshift({
              title: '-',
              id: ''
            });
            column.data = data;
          });
        });
        if (!element.hasClass('frable')) {
          scope.templates = {
            header: (attrs.templateHeader ? attrs.templateHeader : 'frable/header.html'),
            pagination: (attrs.templatePagination ? attrs.templatePagination : 'frable/pager.html')
          };
          var headerTemplate = thead.length > 0 ? thead : angular.element(document.createElement('thead')).attr('ng-include', 'templates.header');
          var paginationTemplate = angular.element('<tfoot />')
            .append(angular.element('<tr />')
              .append(angular.element('<td />')
                .attr({ 'ng-include': 'templates.pagination', 'colspan': columns.length })));
          element.find('thead').remove();
          var tbody = element.find('tbody');
          element.prepend(headerTemplate);
          $compile(headerTemplate)(scope);
          $compile(paginationTemplate)(scope);
          element.addClass('frable');
          tbody.after(paginationTemplate);
        }
      };
    }
  };
}
]);

app.run(['$templateCache', function ($templateCache) {
  $templateCache.put('frable/filters/select-multiple.html', require('./filters/select-multiple.html'));
  $templateCache.put('frable/filters/select.html', require('./filters/select.html'));
  $templateCache.put('frable/filters/text.html', require('./filters/text.html'));
  $templateCache.put('frable/header.html', require('./header.html'));
  $templateCache.put('frable/pager.html', require('./pager.html'));
}]);

module.exports = app;
