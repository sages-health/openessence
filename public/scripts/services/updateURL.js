'use strict';

var angular = require('angular');

/**
 * Service to update the Workbench URL to reflect the
 * current state of the visualizations.
 */
// @ngInject
module.exports = function ($location) {
  var stateString = '';

  /**
   * Return the current state of the workbench in JSON form.
   * @returns {}
   */
  var getState = function () {
    var state = {};
    try {
      var encodedState = $location.search().state;
      if (typeof encodedState !== 'undefined' && encodedState.length > 0) {
        state = JSON.parse(atob(decodeURIComponent($location.search().state)));
      }
    } catch (e) {
      console.log(e);
    }
    return state;
  };

  /**
   * Update the URL with the new state
   * @param state
   */
  var setState = function (state) {
    stateString = btoa(JSON.stringify(state));
    $location.search('state', stateString);
  };

  return {
    /**
     * Update the json value of 'state' in the URL with the new values for id
     * Add if necessary and overwrite existing, but do not delete anything
     *
     * @param id
     * @param attrs
     */
    updateVisualization: function (id, attrs) {
      var state = getState();
      state.visualizations = state.visualizations || [];
      var found = false;
      angular.forEach(state.visualizations, function (viz, key) {
        if (viz.id === id) {
          found = true;
          angular.forEach(attrs, function (vizVal, vizValKey) {
            state.visualizations[key][vizValKey] = vizVal;
          });
        }
      });

      if (!found) {
        attrs.id = attrs.id || id;
        state.visualizations.push(attrs);
      }
      setState(state);
    },
    /**
     * Remove viz with id from the URL
     * @param id
     */
    removeVisualization: function (id) {
      var state = getState();
      state.visualizations = state.visualizations || [];
      var index = -1;
      angular.forEach(state.visualizations, function (val, key) {
        if (val.id === id) {
          index = key;
        }
      });
      if (index !== -1) {
        state.visualizations.splice(index, 1);
        setState(state);
      }
    },
    /**
     * Overwrite the filters entirely
     * @param filters
     */
    updateFilters: function (filters) {
      var state = getState();
      state.filters = filters;
      setState(state);
    },
    getState: getState,
    getStateString: function () {
      return stateString;
    }
  };
};
