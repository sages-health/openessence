/**
 *
 */

// These parameters will have to be passed from the detector interface

//var Date, startDate = new Date(2007,00,10);
//alert(startDate)
//var bAutoCoef=true;
//var  alpha = Array(3), Adj, HOLfac, multFac;
  //
//var BASELINE = 56; // Multiple of 7
//var GUARDBAND = 0;
//var ADJ = 0;
//var HOLFAC = 0.2; // If 1 no parameter will be adjusted
//var SMOOTHVEC0 = 0.3;
//var SMOOTHVEC1 = 0.0;
//var SMOOTHVEC2 = 0.05;
//var APE_LIMIT = 0.5; // This value determines if we update the parameters or not
//var THRESHOLD_PROBABILITY_RED_ALERT = 0.01;
//var THRESHOLD_PROBABILITY_YELLOW_ALERT = 0.05;
  //

function calculateGs(data, startDate, bAutoCoef, alpha, BASELINE, GUARDBAND, ADJ, HOLFAC, APE_LIMIT, THRESHOLD_PROBABILITY_RED_ALERT, THRESHOLD_PROBABILITY_YELLOW_ALERT) {

  var threshPValueR, threshPValueY;
  var levels = [], pvalues = [], expectedData = [], colors = [], r2Levels = [], switchFlags = [], test_stat = [], HOLlist = [];
  var SMOOTHVEC0 = alpha[0];
  var SMOOTHVEC1 = alpha[1];
  var SMOOTHVEC2 = alpha[2];
  var Adj = ADJ;

  if (data.length <= BASELINE) {
    alert(" detector needs at least " + BASELINE + " data pos to run detection.");
  }
  var bSparseFlag;
  var i;
  var ck, c0 = [], ytemp = [];
  UCL_R = [], UCL_Y = [], sigmaCoeff = [], deltaSigma = [], Sigma = 0, minSigma = [];
  UCL_R = Array(BASELINE);
  UCL_Y = Array(BASELINE);

  minSigma = Array(BASELINE);
  //
  levels = valuevec(0.5, data.length);
  pvalues = valuevec(-9999, data.length);
  expectedData = valuevec(0, data.length);
  colors = [data.length];
  r2Levels = valuevec(0, data.length);
  switchFlags = valuevec(0, data.length);
  test_stat = valuevec(-9999, data.length);
  HOLfac = HOLFAC;
  //
  BaseVec = [];
  for (var i = 0; i < BASELINE; i++) {
    BaseVec.push(i);
  }

  datak = data.slice(0);

  //   datakr[][] = reshape (datak, Baseline/7, 7);
  //  c0 = mean(datakr); ck = mean(mean(datakr));
  datakr = reshape(subset2(datak, BaseVec), 7, BASELINE / 7);

  c0 = mean(transpose(datakr));
  ck = mean(mean(transpose(datakr)));

  for (n0 = 0; n0 < c0.length; n0++) {
    c0[n0] = c0[n0] / ck;
  } // starting seasonality coefficients
  //for ( k=0; k<c0.length; k++) { System.out.prln (ck+"/"+c0[k]+" "); } System.out.prln(); System.out.prln();
  m0 = mean(mean(transpose(datakr))); // starting level (mean)
  //

  m = valuevec(m0, data.length);
  b = valuevec(0, data.length); // initialize trend at 0
  // Depending on the mean of the baseline choose smoothing coefficients
  // alpha is a vector with 3 coefficients - alpha(1) - level alpha(2)- trend
  // alpha(3) is seasonality (corresponds to alpha beta and gamma in the paper

  if (reshapeback(datakr).median() == 0) {
    alpha[0] = 0.4;
    alpha[1] = 0;
    alpha[2] = 0;
    c0 = valuevec(1, 7);
    Adj = 0.2;
    bSparseFlag = true;
  } else {
    if (bAutoCoef == true) {
      if (m0 < 1) {
        alpha[0] = 0.05;
        alpha[1] = 0;
        alpha[2] = 0.1;
      } else if (m0 < 10) {
        alpha[0] = 0.1;
        alpha[1] = 0;
        alpha[2] = 0.05;
      } else if (m0 < 100) {
        alpha[0] = 0.15;
        alpha[1] = 0;
        alpha[2] = 0.05;
      } else /*(m0 >= 100)*/ {
        alpha[0] = 0.4;
        alpha[1] = 0;
        alpha[2] = 0.05;
      }
    }
    bSparseFlag = false;
  }

  HOL = isHoliday(startDate, datak.length);

  // Format of the parameterList:
  // HOL - vector of holidays
  season = 7; // Seasonality
  y = datak.slice(0);

  //
  b0 = 0; // No trend
  // Initialize values
  m[season - 1] = m0;
  b[season - 1] = b0;
  b[2 * season - 1] = b0;
  c = valuevec(1, data.length);
  arrayAdd(y, ADJ); // add adjustment to the input series
  for (var i = 0; i < 7; i++) {
    c[i] = Math.max(c0[i], 0.01);
  } // make sure seasonality coefficients are not 0s
  for (var i = 7; i < 14; i++) {
    c[i] = c[i - 7];
  } // initialize seasonality coefficient vector
  //for ( k=0; k<14; k++) { System.out.prln (c[k]+" "); } System.out.prln(); System.out.prln();
  m[2 * season - 1] = m0; // initialize vector of levels
  denom = valuevec(0, y.length);
  //
  y_Pred = valuevec(0, y.length); // initialize predictions
  ndxBaseline = Array(14);
  for (var i = 0; i < 14; i++) {
    ndxBaseline[i] = i + 1;
  } // starting baseline
  //

  for (var i = 2 * season + GUARDBAND; i < datak.length; i++) {
    // beginning at day 15 + Guardband
    // use the indices of the entire baseline period
    // checking that there are at least 7 non-zero values "together"
    ndxOK = filterBaselineZeros(subset2_js(datak, ndxBaseline));

    ndxBaselineOK = subset2(ndxBaseline, ndxOK);

    if (ndxBaselineOK.length >= 7) {
      if (
        (HOL[i] == 1) && !((y[i] < (c[i - 6] * m[i - 6] + denom[i - 1])) && (y[i] > (c[i - 6] * m[i - 6] - denom[i - 1])))) {
        // if holiday - check if the values within reasonable limits (+/- 1 standard deviation from the mean)
        multFac = HOLfac; // potentially change to use seasonality parameter from the last weekend
      } else {
        multFac = c[i - season];
      }
      // If mean of the recent "good" data all of a sudden is greater
      // than 5 - start updating seasonal coefficients;
      //System.out.prln (datak.length+" "+ndxBaselineOK.length+" "+datakr.length+" "+datakr[0].length+" "+ndxBaseline[ndxBaseline.length-1]);
      if (((subset2_js(datak, ndxBaselineOK)).average() >= 5) && (datak.median() == 0)) {
        //System.out.prln ("1");
        alpha[2] = 0.05;
        bSparseFlag = false;
        if ((ndxBaselineOK.length >= 14) &&
          (ndxBaselineOK[ndxBaselineOK.length - 1] - ndxBaselineOK[ndxBaselineOK.length - 1 - 13]
            == 13)) {
          datakr = reshape(
            subset2_js(y, dataVec(ndxBaselineOK, ndxBaselineOK.length - 1 - 13,
                ndxBaselineOK.length - 1)),
            7, 2);
          c0 = mean(transpose(datakr));
          ck = mean(mean(transpose(datakr)));
          for (k = i - season, n0 = 0; k < i; k++, n0++) {
            c[k] = c0[n0] / ck;
          }
        }
      }
      // Updating of parameters
      m[i] = alpha[0] * y[i] / c[i - season] + (1 - alpha[0]) * (m[i - 1] + b[i - 1]);
      // Level for counts cannot become negative
      m[i] = Math.max(m[i], 0.5);

      b[i] = alpha[1] * (m[i] - m[i - 1]) + (1 - alpha[1]) * b[i - 1];

      y_Pred[i] = Math.max(multFac * (m[i] + GUARDBAND * b[i]), 0); // prediction

      if (m[i - 1] == 0) {
        c[i] = alpha[2] * y[i] + (1 - alpha[2]) * c[i - season];
      } else {
        c[i] = alpha[2] * y[i] / m[i - 1] + (1 - alpha[2]) * c[i - season];
      }
    } else { // In case baseline is not complete keep the old parameters
      m[i] = m[i - 1];
      b[i] = b[i - 1];

      c[i] = c[i - season];
    }
    //
    memList = [];
    memlist2 = [];
    memlist3 = [];
    memList4 = [];
    memList5 = dataVec(c, i - 6, i);

    // alert('ndxbasline');alert(ndxBaselineOK);alert(ndxBaselineOK[0])

    memList4 = arrayAbs(arrayAdd(dataVec(c, i - 6, i), -c[i]))
    memList2 = findLT(memList4, 0.1);
    memList3 = arrayMod(arrayAdd(memList2.slice(0), i + 2), 7);
    memList = ismember(arrayMod(ndxBaselineOK, 7), memList3);

    HOLlist = subset2_js(HOL, ndxBaselineOK);

    for (var k = 0; k < ndxBaselineOK.length; k++) {
      //alert('hollistlength'); alert(HOLlist[k].length)
      if (HOLlist[k] == 1) {
        memList[k] = 0;
      }
    }
    memList = find(memList);
    if (memList.length <= 4) {
      //System.out.prln ("2");

      denom[i] = (subset2_js(y, ndxBaseline)).std();

      //alert(denom[i])
      //alert('DENOM');alert((y.subset(ndxBaseline)).std())
    } else {
      //System.out.prln ("3");
      //alert('ELSE');

      denom[i] = (subset2(y, memList)).std();//alert(denom[i]);

    }

    // For EWMA switch
    // the term due to the smoothed data
    if (bSparseFlag) {

      for (k = 0; k < BASELINE; k++) {

        UCL_R[k] = TDistribution.inverseCumulativeProbability(1 - 0.01);
        UCL_Y[k] = TDistribution.inverseCumulativeProbability(1 - 0.05);
      }
      degFreedom = ndxBaselineOK.length - 1;

      Term1 = alpha[0] / (2.0 - alpha[0]);
      // the term due to the baseline mean
      Term2 = Array(BASELINE);
      for (var k = 0; k < Term2.length; k++) {
        Term2[k] = 1.0 / (2.0 + k);
      }
      // the term due to twice their covariance
      Term3 = Array(BASELINE);
      for (var k = 0; k < Term3.length; k++) {
        Term3[k] = -2 * pow(1 - alpha[0], GUARDBAND + 1) * (1 - pow(1 - alpha[0], 2.0 + k)) / (2.0 + k);
      }
      // the correction factor for sigma
      sigmaCoeff = Array(BASELINE);
      for (var k = 0; k < BASELINE; k++) {
        sigmaCoeff[k] = Math.sqrt(Term1 + Term2[k] + Term3[k]);
      }
      deltaSigma = Array(BASELINE);
      for (var k = 0; k < BASELINE; k++) {
        deltaSigma[k] =
          (alpha[0] / UCL_Y[k]) * (0.1289 - (0.2414 - 0.1826 * pow(1 - alpha[0], 4)) * log(
            10 * 0.05)); // hard-coded yellow threshold to 0.05
      }
      if (!any(subset2_js(y, ndxBaselineOK))) {
        Sigma = 0;
      } else {
        Sigma = sigmaCoeff[degFreedom - 1] * (subset2_js(y, ndxBaselineOK)).std() + deltaSigma[degFreedom - 1];
        for (var k = 0; k < BASELINE; k++) {
          minSigma[k] = (alpha[0] / UCL_Y[k]) * (1 + 0.5 * (1 - alpha[0]) * (1 - alpha[0]));
        }
        Sigma = Math.max(Sigma, minSigma[degFreedom - 1]);
      }
    }

    denom[i] = Math.max(denom[i], 0.5);
    // making sure that denominator is big enough
    // Don't update the mean if seasonal coefficient is small, or
    // there is a drastic jump in the mean
    if (c[i] < 0.05 || m[i] / m[i - 1] > 10) {
      m[i] = m[i - 1];
    }
    // Don't update parameters if
    // 1) prediction error is too big
    // 2) prediction is negative
    // 3) Holiday
    // 4) Day after holiday
    if ((
      (Math.abs(y_Pred[i] - y[i] + ADJ) / denom[i] > APE_LIMIT) &&
      (ndxBaseline.length == ndxBaselineOK.length) &&
      (y[i] > c[8 + (i % 7) - 1] * percentile(subset2_js(y, ndxBaseline), 0.95)))
      || HOL[i] == 1) {
      m[i] = m[i - 1];
      b[i] = b[i - 1];
      c[i] = c[i - season];
    }
    test_stat[i] =
      (y[i] - y_Pred[i] - ADJ)
      / denom[i]; // Calculating the test statistics(removing the adjustment added on line 69
    //if (isNaN(test_stat[i]))
    //{
    // alert('test stat NaN')
    //}

    if (bSparseFlag) {
      ytemp = subset2_js(y, ndxBaselineOK);
      Sigma = Math.max(Sigma, 0.5);
      test_stat[i] = (m[i] - ytemp.average() + ADJ) / Sigma;

    }

    if ((y[i] - Adj) == 0) { // if value is 0 to begin with - return 0 for the statistic
      test_stat[i] = 0;
    }
    if (ndxBaselineOK.length == 0) {
      test_stat[i] = 0;
    }
    pvalues[i] = 1 - normcdf(test_stat[i]); // Using Gaussian (normal) 0,1 distribution table value
    if (ndxBaseline[ndxBaseline.length - 1] < BASELINE) {
      // increase baseline vector
      ndxBaseline.unshift(0);
    }

    arrayAdd(ndxBaseline, 1); // go forward by one day
    //System.out.prln (String.format ("%.4f %.4f %.4f %.4f %.4f %.4f %.4f %.4f %.4f",

  }
  arrayAdd(y_Pred, -ADJ); // remove adjustment from prediction
  //

  for (i = 0; i < data.length; i++) {
    levels[i] = pvalues[i];
  }
  expectedData = y_Pred;
  document.writeln('<br>');
  return ([test_stat, pvalues]);
}

		

		
