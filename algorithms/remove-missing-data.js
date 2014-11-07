'use strict';

var assign = require('object-assign');
var openMath = require('./OpenMath');


/**
 * Return the number of occurrences of the element `0` in the specified array. For example,
 *
 *     getNumZeros([10, 0, 0, 1, 0])
 *
 * would return 3.
 *
 * @param array - array of numbers
 * @returns {int} number of 0s
 */
function getNumZeros(array) {
  return array.reduce(function (count, datum) {
    if (datum === 0) {
      count++;
    }
    return count;
  }, 0);
}

/**
 * Calculate the position of each sequence of consecutive 0s in the specified array of numbers. For example,
 *
 *     getZeros([10, 1, 0, 1, 0, 0])
 *
 * would return `[{start: 2, end: 2}, {start: 4, end: 5}]`
 *
 * @param array - array of numbers
 * @returns {Array} start and end of each sequence of consecutive 0s
 */
function getZeros(array) {
  var zeros = [];
  var currentZero = 0;

  for (var i = 0; i < array.length; i++) {
    if (array[i] === 0) {
      if (!zeros[currentZero]) {
        zeros[currentZero] = {start: i};
      }
    } else {
      if (zeros[currentZero] && zeros[currentZero].start !== undefined) {
        zeros[currentZero].end = i - 1;
        currentZero++;
      }
    }
  }

  // terminate trailing sequence of 0s
  if (zeros[currentZero] && zeros[currentZero].end === undefined) {
    zeros[currentZero].end = array.length - 1;
  }

  return zeros;
}
/*
 Array.prototype.median = function () {
 var v = this.slice(0)
 v.sort(function (a, b) {
 return a - b;
 });
 var half = Math.floor(v.length / 2);
 if (v.length % 2) {
 return v[half];
 }
 else {
 return (v[half - 1] + v[half]) / 2.0;
 }
 }

 Array.prototype.size = function () {
 return([this.length, this[0].length])
 }
 Array.prototype.print = function () {
 for (i = 0; i < this.length; i++) {
 document.write(this[i].toFixed(4), '<br>')
 }
 }

 exports.filterBaselineZerosTest =
 function filterBaselineZerosTest (d) {
 var median = d.median();
 var nonzeromedian = (d.subset(openMath.find(d))).median();
 return (median > 0 || nonzeromedian > 4);
 }
 */
/**
 * Remove sequences of consecutive zeros that are "unusually" long from an array of numbers. A sequence of consecutive
 * zeros is unusually long if
 *
 *     ((number of zeros outside the string) / (number of values outside the string)) ^ (the number of zeros in the string) > thresholdProbability
 *
 * Practically speaking, this algorithm is useful to remove 0s that indicate missing data points while retaining zeros
 * that truly indicate the presence of zero counts.
 * @param data - array of values
 * @param options
 * @returns {*} array of values with long sequences of 0s removed
 */
exports.removeMissingData = function removeMissingData(data, options) {
  var totalNumZeros = getNumZeros(data);
  var zeros = getZeros(data);

  options = assign({
    minConsecutiveZeros: 2,
    thresholdProbability: 0.01,

    // TODO allow specifying arbitrary value to search for rather than assuming 0
    // TODO split out into separate library

    /**
     * Minimum number of non-zeros in the array. If the array contains less than this number of non-zeros, all
     * your data is considered missing and an empty array is returned.
     */
    minNonZeros: 1
  }, options);

  // sort so we can terminate as soon as we encounter a short enough string of 0s, thereby avoiding extraneous
  // copying of the input data
  zeros.sort(function (z) {
    // technically the length is z.end - z.start + 1, but that doesn't matter for sorting
    return z.end - z.start;
  });

  // keep track of how many 0s we've removed so we can shift positions of remaining 0s
  var numZerosRemoved = 0;

  // dataWithoutZeros is the output
  var dataWithoutZeros = data;
  zeros.every(function (zero) {
    // number of zeros in this string of zeros
    var numZeros = zero.end - zero.start + 1;

    // shift the position of this zero according to how many 0s we've removed from the array so far
    zero.start -= numZerosRemoved;
    zero.end -= numZerosRemoved;

    if (numZeros < options.minConsecutiveZeros) {
      // we can terminate since we sorted the zeros by their length
      return false;
    }

    // tempData is dataWithoutZeros minus the current sequence of 0s
    var tempData;
    if (zero.start !== 0) {
      // TODO if we get large enough inputs we should do this in-place
      tempData = dataWithoutZeros.slice(0, zero.start);

      // if this sequence of 0s doesn't terminate the array, then add everything after it
      if (zero.end !== dataWithoutZeros.length - 1) {
        tempData = tempData.concat(dataWithoutZeros.slice(zero.end + 1));
      }
    } else if (zero.end !== dataWithoutZeros.length - 1) {
      tempData = dataWithoutZeros.slice(zero.end + 1);
    } else {
      // string is all 0s
      return false;
    }

    // the number of 0s outside of the sequence being tested (or 1 to make the math sane)
    var numZerosOut = Math.max(1, totalNumZeros - numZeros - numZerosRemoved);

    if (Math.pow((numZerosOut / tempData.length), numZeros) > options.thresholdProbability) {
      return false;
    }

    // we're OK to remove this sequence of 0s
    numZerosRemoved += numZeros;
    dataWithoutZeros = tempData;

    return true;
  });

  // TODO don't do this
  if (dataWithoutZeros.filter(function (d) {
    return d !== 0;
  }).length < options.minNonZeros) {
    return [];
  }
  console.log("Data without zeroes length: " + dataWithoutZeros.length);
  return dataWithoutZeros;
};
