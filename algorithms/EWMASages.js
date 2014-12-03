"use strict";

var TDistribution = require('./TDistribution');
var openMath = require('./OpenMath');
var filterBaselineZeros = require('./FilterBaselineZeros3');
var assign = require('object-assign');

// EWMA SAGES
exports.calculateEWMA =
  function calculateEWMA(data, OMEGA, MIN_DEG_FREEDOM, MAX_BASELINE_LEN, THRESHOLD_PROBABILITY_RED_ALERT, THRESHOLD_PROBABILITY_YELLOW_ALERT, NUM_GUARDBAND, REMOVE_ZEROES, MIN_PROB_LEVEL, NUM_FIT_PARAMS) {


    //OMEGA the EWMA smoothing coefficient (between 0 and 1) default 0.4
    //MIN_DEG_FREEDOM the minimum number of degrees of freedom
    //MAX_BASELINE_LEN the maximum length of the baseline period
    //
    // The one-sided threshold p-value for rejecting the null hypothesis, corresponding to red alerts
    //
    //THRESHOLD_PROBABILITY_RED_ALERT;
    /**
     * The one-sided threshold p-value for rejecting the null hypothesis, corresponding to yellow alerts
     */
    //THRESHOLD_PROBABILITY_YELLOW_ALERT;
    /**
     * the length of the guard band period
     */
    //NUM_GUARDBAND = guardband;
    /**
     * if true unusually long strings of zeros in the baseline period are removed prior to applying process control
     */
    //REMOVE_ZEROES = remove;

    //
    // MIN_PROB_LEVEL
    // NUM_FIT_PARAMS
    var minBaseline = NUM_FIT_PARAMS + MIN_DEG_FREEDOM;
    var degFreedomRange = MAX_BASELINE_LEN - NUM_FIT_PARAMS;

    var UCL_R = new Array();
    var UCL_Y = new Array();
    var sigmaCoeff = new Array();
    var deltaSigma = new Array();
    var minSigma = new Array();
    var degFreedom = new Array();
    var term1 = OMEGA / (2.0 - OMEGA);
    var term2 = new Array();
    var term3 = new Array();

    for (var i = 0; i < degFreedomRange; i++) {
      UCL_R[i] = TDistribution.inverseCumulativeProbability(1 - THRESHOLD_PROBABILITY_RED_ALERT, i + 1);
      UCL_Y[i] = TDistribution.inverseCumulativeProbability(1 - THRESHOLD_PROBABILITY_YELLOW_ALERT, i + 1);
      var numBaseline = NUM_FIT_PARAMS + i + 1;
      term2[i] = 1.0 / numBaseline;
      term3[i] = -2.0 * Math.pow((1 - OMEGA), (NUM_GUARDBAND + 1.0)) *
        (1.0 - Math.pow((1 - OMEGA), numBaseline)) / numBaseline;

      sigmaCoeff[i] = Math.sqrt(term1 + term2[i] + term3[i]);
      deltaSigma[i] = (OMEGA / UCL_Y[i]) *
        (0.1289 - (0.2414 - 0.1826 * Math.pow((1 - OMEGA), 4)) *
          Math.log(10.0 * THRESHOLD_PROBABILITY_YELLOW_ALERT));

      minSigma[i] = (OMEGA / UCL_Y[i]) * (1.0 + 0.5 * Math.pow((1 - OMEGA), 2));
    }


    var pvalues = openMath.valuevec(null, data.length);
    //var expectedData = openMath.valuevec(0, data.length);
    var test_stat = openMath.valuevec(null, data.length);
    var sigma, testBase = [], baselineData = [];
    var expectedDataArray = openMath.valuevec(null, data.length);

    //
    // initialize the smoothed data
    var smoothedData = data[0];
    for (var m = 1; m < (minBaseline + NUM_GUARDBAND) && m < data.length; m++) {
      smoothedData = OMEGA * data[m] + (1 - OMEGA) * smoothedData;
    }

    // initialize the indices of the baseline period
    var ndxBaseline = [];
    for (var l = 0; l < minBaseline - 1; l++) {
      ndxBaseline.push(l);
    }

    // loop through the days on which to make predictions
    for (var j = minBaseline + NUM_GUARDBAND; j < data.length; j++) {
      // smooth the data using an exponentially weighted moving average (EWMA)
      smoothedData = OMEGA * data[j] + (1 - OMEGA) * smoothedData;

      // lengthen and advance the baseline period
      if (ndxBaseline.length < 1 || (ndxBaseline[ndxBaseline.length - 1] + 1 < MAX_BASELINE_LEN)) {
        ndxBaseline.unshift(-1);
      }
      // advance the indices of the baseline period
      openMath.arrayAdd(ndxBaseline, 1);

      var testBase = openMath.subset2(data, ndxBaseline);
      var baselineData = openMath.subset2(data, ndxBaseline);

      if (REMOVE_ZEROES && filterBaselineZeros.filterBaselineZerosTest(testBase)) {
        var ndxOK = filterBaselineZeros.filterBaselineZeros(testBase);
        baselineData = openMath.subset2(testBase, ndxOK);
        if (testBase.length != baselineData.length) {
          console.log(j + " original: " + testBase.length + " new length: " + baselineData.length);
        }
      } else {
        baselineData = testBase.slice(0);
      }

      // check the baseline period is filled with zeros; no prediction can be
      if (baselineData.ifZero()) {
        continue;
      }

      // the number of degrees of freedom
      degFreedom[j] = baselineData.length - NUM_FIT_PARAMS;
      if (degFreedom[j] < MIN_DEG_FREEDOM) {
        continue;
      }

      //console.log("degFreedom length: " + degFreedom.length + " baselineData length: " + baselineData.length);
      // the predicted current value of the data
      //expectedData[j] = baselineData.average();
      var expectedData = baselineData.average();
      expectedDataArray[j] = expectedData;

      // calculate the test statistic
      // the adjusted standard deviation of the baseline data
      sigma = sigmaCoeff[degFreedom[j] - 1] * baselineData.std() + deltaSigma[degFreedom[j] - 1];
      // don't allow values smaller than MinSigma
      sigma = Math.max(sigma, minSigma[degFreedom[j] - 1]);
      // the test statistic

      test_stat[j] = (smoothedData - expectedData) / sigma;
      if (Math.abs(test_stat[j]) > UCL_R[degFreedom[j] - 1]) {
        smoothedData = expectedData + openMath.sign(test_stat[j]) * UCL_R[degFreedom[j] - 1] * sigma;
      }
    }
    console.log(expectedDataArray);
    for (var k = 0; k < data.length; k++) {
      if (Math.abs(test_stat[k]) > 0.0) {
        pvalues[k] = 1 - TDistribution.cumulativeProbability(test_stat[k], degFreedom[k]);
        //levels[k] = pvalues.slice(k, k + 1);
        if (pvalues[k] < MIN_PROB_LEVEL) {
          pvalues[k] = MIN_PROB_LEVEL;
        }
      }
      //console.log(test_stat[k] + "\t" + pvalues[k]);
    }
    return([test_stat, pvalues])
  }

//

