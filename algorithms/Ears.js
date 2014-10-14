/*
 * Copyright (c) 2013 The Johns Hopkins University/Applied Physics Laboratory
 *                             All rights reserved.
 *
 * This material may be used, modified, or reproduced by or for the U.S.
 * Government pursuant to the rights granted under the clauses at
 * DFARS 252.227-7013/7014 or FAR 52.227-14.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * NO WARRANTY.   THIS MATERIAL IS PROVIDED "AS IS."  JHU/APL DISCLAIMS ALL
 * WARRANTIES IN THE MATERIAL, WHETHER EXPRESS OR IMPLIED, INCLUDING (BUT NOT
 * LIMITED TO) ANY AND ALL IMPLIED WARRANTIES OF PERFORMANCE,
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT OF
 * INTELLECTUAL PROPERTY RIGHTS. ANY USER OF THE MATERIAL ASSUMES THE ENTIRE
 * RISK AND LIABILITY FOR USING THE MATERIAL.  IN NO EVENT SHALL JHU/APL BE
 * LIABLE TO ANY USER OF THE MATERIAL FOR ANY ACTUAL, INDIRECT,
 * CONSEQUENTIAL, SPECIAL OR OTHER DAMAGES ARISING FROM THE USE OF, OR
 * INABILITY TO USE, THE MATERIAL, INCLUDING, BUT NOT LIMITED TO, ANY DAMAGES
 * FOR LOST PROFITS.
 */


/**
 * Runs the CDC Ears algorithms C1, C2, and C3.
 */

/**
 * Runs the CDC Ears algorithms C1.
 *
 * @param data data array from first day to last, no interuptions.
 */
function calculateC1(data) {
  return calculateEARS(data, 7, 0, 0, 1, .1, 2);
}

/**
 * Runs the CDC Ears algorithms C2.
 *
 * @param data data array from first day to last, no interuptions.
 */
function calculateC2(data) {
  return calculateEARS(data, 7, 2, 0, 1, .1, 2);
}

/**
 * Runs the CDC Ears algorithms C3.
 *
 * @param data data array from first day to last, no interuptions.
 */
function calculateC3(data) {
  return calculateEARS(data, 7, 2, 1, 1, .1, 2);
}

/**
 * Calculates the results of the CDC ears algorithms.
 *
 * @param data      data array from first day to last, no interuptions.
 * @param baseline  how many days of baseline to use.
 * @param baseLag   how many days of guardband to use.
 * @param cusumFlag whether or not to use the cusum part of the algorithm.
 * @param cusumK    CUSUM K value
 * @param minSigma  minimum sigma allowed
 * @param thresh    what the threshold should be set at.
 */
function calculateEARS(data, baseline, baseLag, cusumFlag, cusumK, minSigma, thresh) {

  sigmaEstimate = minSigma;
  earStat = Array(data.length);
  for (i = 0; i < earStat.length; i++) {
    earStat[i] = 0;
  }
  cusum0 = 0;
  cusum1 = 0;

  ndxBase = 0;
  estMean = 0;
  estSigma = 0;
  currSum = 0;

  for (i = baseline + baseLag; i < data.length; i++) {
    ndxBase = i - (baseline + baseLag);
    list = [];
    for (j = 0; j < baseline; j++) {
      list.push((data[ndxBase]));
      ndxBase++;
    }
    estMean = list.average();
    estSigma = Math.max(minSigma, list.std());

    currSum = Math.max(0, data[i] - estMean - cusumK * estSigma) / estSigma;
    if (isNaN(currSum) || !isFinite(currSum)) {
      currSum = 0;
    }
    earStat[i] = currSum + cusumFlag * (cusum0 + cusum1);
    cusum0 = cusum1;
    if (currSum >= thresh) {
      cusum1 = 0;
    } else {
      cusum1 = currSum;
    }
  }
  return earStat;
}

function gettestC1(data) {
  return calculateC1(data, 7, 0, 0, 1, .02, 2);
}

/**
 * Tests the CDC Ears algorithms C2.
 *
 * @param data data array from first day to last, no interuptions.
 */
function gettestC2(data) {
  return calculateC2(data, 7, 2, 0, 1, .02, 2);
}

/**
 * Tests the CDC Ears algorithms C3.
 *
 * @param data data array from first day to last, no interuptions.
 */
function gettestC3(data) {
  return calculateC3(data, 7, 2, 1, 1, .02, 2);
}

/**
 * Tests the Ears algorithms using a data array.
 *
 * @param args command line arguments - none needed
 */

data = [6, 142, 124, 145, 9, 6, 184, 130, 140, 136, 136, 20, 3, 169, 170, 134, 106,
  181, 22, 1, 7, 233, 196, 153, 155, 19, 2, 277, 198, 192, 191, 218, 25, 4,
  281, 161, 199, 182, 197, 19, 15, 272, 235, 227, 169, 153, 34, 7, 8, 299,
  210, 135, 135, 18, 12, 163, 120, 85, 91, 87, 17, 3, 167, 130, 86, 87, 88,
  11, 5, 128, 103, 86, 101, 79, 13, 4, 113, 92, 82, 85, 59, 16, 9, 101, 100,
  76, 68, 83, 7, 5, 110, 98, 60, 37, 91, 6, 1, 53, 87, 115, 93, 83, 8, 4, 126,
  96, 84, 73, 67, 6, 3, 143, 88, 90, 92, 109, 8, 2, 150, 130, 91, 93, 101, 3,
  0, 157, 119, 106, 104, 84, 6, 1, 140, 100, 90, 51, 92, 9, 2, 111, 103, 95,
  89, 46, 16, 3, 1, 78, 77, 78, 59, 4, 2, 69, 70, 61, 53, 47, 5, 0, 68, 75,
  55, 49, 42, 2, 1, 45, 44, 38, 32, 39, 6, 0, 62, 53, 39, 42, 39, 3, 2, 45,
  44, 30, 1, 1, 6, 2, 32, 33, 13, 16, 34, 6, 0, 39, 30, 26, 21, 21, 4, 1, 29,
  34, 20, 25, 21, 3, 3, 44, 1];

data2 = [25, 35, 30, 9, 4, 40, 30, 37, 28, 24, 13, 3, 30, 34, 25, 32, 20, 27, 16,
  57, 77, 46, 16, 19, 12, 6, 48, 42, 32, 27, 38, 20, 11, 57, 44, 40, 32, 24,
  13, 4, 26, 46, 32, 18, 25, 20, 3, 40, 36, 32, 34, 25, 15, 8, 11, 33, 22,
  36, 30, 13, 3, 13, 64, 44, 42, 32, 15, 7, 45, 34, 39, 22, 40, 13, 6, 37,
  40, 32, 39, 38, 11, 5, 44, 37, 46, 22, 29, 16, 9, 42, 43, 33, 25, 32, 1,
  11, 45, 24, 30, 25, 34, 5, 9, 29, 26, 25, 28, 20, 8, 5, 24, 23, 34, 21, 19,
  12, 1, 30, 30, 24, 32, 38, 7, 5, 38, 22, 14, 18, 21, 5, 5, 22, 16, 13, 15,
  15, 3, 1, 14, 17, 9, 20, 5, 3, 3, 8, 3, 1, 0];

//ts=[];
//ts[0] = gettestC2(data);
//ts[1]= gettestC3(data);
//ts[2]=gettestC1(data);
//ts2 = transpose(ts);
//var csvRows = [];

//for(var i=0, l=ts2.length; i<l; ++i){
//    csvRows.push(ts2[i].join(','));
//}

//var csvString = csvRows.join("%0A");
//var a         = document.createElement('a');
//a.href        = 'data:attachment/csv,' + csvString;
//a.target      = '_blank';
//a.download    = 'myFe.csv';
//document.body.appendChild(a);
//a.click();







