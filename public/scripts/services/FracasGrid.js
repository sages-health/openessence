'use strict';

var angular = require('angular');
var services = require('../modules').services;

angular.module(services.name).factory('FracasGrid', function () {

  /**
   *
   * @param width number of columns in this grid
   * @constructor
   */
  function FracasGrid (width) {
    this.width = width || 2;

    // If you delete an item from the grid, subsequent elements should "slide" back to fill in the gap. But their state
    // should not change, only their position. So we need to assign unique IDs to each element of the grid, for use by
    // ngRepeat (see "track by").
    this.nextId = -1;

    // ID used for plus. Since we only have one plus per grid, and it has no state, this is a constant.
    this.plusId = -1;

    this.plus = {plus: true, id: this.plusId};
    this.rows = [[this.plus]];
  }

  FracasGrid.prototype.indexOfPlus = function () {
    var lastRow = this.rows[this.rows.length - 1];
    var plusIndex = -1;
    lastRow.forEach(function (filter, index) {
      if (filter.plus) {
        plusIndex = index;
        return true;
      }
    });

    return plusIndex;
  };

  FracasGrid.prototype.add = function (item) {
    var plusIndex = this.indexOfPlus();
    var lastRowIndex = this.rows.length - 1;

    item = angular.extend({
      id: ++this.nextId,
      row: lastRowIndex,
      col: this.indexOfPlus()
    }, item);

    // replace + with visualization
    this.rows[lastRowIndex][plusIndex] = item;

    // add plus back
    if (plusIndex === this.width - 1) {
      // need to add a new row
      this.rows.push([this.plus]);
    } else {
      this.rows[lastRowIndex][plusIndex + 1] = this.plus;
    }
  };

  FracasGrid.prototype.remove = function (item) {
    // flatten the grid to make it easier to work with
    var rows = this.toArray();

    // remove item in question
    rows.splice(item.row * this.width + item.col, 1);

    rows.forEach(function (r, i) {
      r.row = Math.floor(i / this.width);
      r.col = i % this.width;
      this.rows[r.row][r.col] = r;
    }.bind(this));

    // delete last item
    this.rows[this.rows.length - 1].pop();
    if (this.rows[this.rows.length - 1].length === 0) {
      this.rows.pop(); // delete the empty row
    }
  };

  /**
   * Flattens the grid into a 1-dimensional array
   * @returns {Array}
   */
  FracasGrid.prototype.toArray = function () {
    var vector = [];
    this.rows.forEach(function (r) {
      r.forEach(function (e) {
        vector.push(e);
      });
    });

    return vector;
  };

  return FracasGrid;
});
