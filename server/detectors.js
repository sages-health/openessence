'use strict';

var express = require('express');
//var hidalgo = require('hidalgo');
var cuSum = require('../algorithms/CusumSagesDetector');
var ewma = require('../algorithms/EWMASages');

module.exports = function () {
  var app = express();
  app.use(require('body-parser').json());

  // TODO versioning with Accept: application/vnd.fracas.v1+json

  /*
   var cusum = express();
   cusum.use('/resources', function (req, res, next) {
   proxy.web(req, res, {target: conf.url + '/resources'})
   });
   */
  app.post('/cusum', function (req, res) {
    // TODO have some API for specifying query to run instead of passing data around
    var data = req.body.data;
    var baseline = req.body.baseline;
    var guardBand = req.body.guardBand;

    //calculateCUSUM (data, CUSUM_K, BASELINE, GUARDBAND, MIN_SIGMA, RESET_LEVEL)
    var output = cuSum.calculateCUSUM(data, 0.5, baseline, guardBand, 0.5, 4);
    res.send({
      pValues: output.pValues,
      expectedValues: output.testStats
    });
  });

//  app.post('/ewma');
  app.post('/ewma', function (req, res) {
    // TODO have some API for specifying query to run instead of passing data around
    var data = req.body.data;
    /*
     var probRed = req.body.probRed;
     var probYellow = req.body.probYellow;
     var minProb = req.body.minProb;
     var numFitParams = req.body.numFitParams;
     var minDegFreedom = req.body.minDegFreedom;
     var removeZeroes = req.body.removeZeroes;
     var omega = req.body.omega;
     */

    var baseline = req.body.baseline;
    var guardBand = req.body.guardBand;
    //calculateEWMA(data, OMEGA, MIN_DEG_FREEDOM, MAX_BASELINE_LEN, THRESHOLD_PROBABILITY_RED_ALERT, THRESHOLD_PROBABILITY_YELLOW_ALERT, NUM_GUARDBAND, REMOVE_ZEROES, MIN_PROB_LEVEL, NUM_FIT_PARAMS)
    //calculateEWMA(data, 0.4, 2, 28, 0.01, 0.05, 2, true, 1E-6, 1);
    var output = ewma.calculateEWMA(data, 0.4, 2, baseline, 0.01, 0.05, guardBand, true, 1E-6, 1);
    res.send({
      pValues: output.pValues,
      expectedValues: output.testStats
    });
  });
//  app.post('/ears');
//
//  app.post('/gs');
//
//
//  app.post('/ears'); // TODO return results from all EARS?
//  app.post('/ears/1');
//  app.post('/ears/2');
//  app.post('/ears/3');

    return app;
};
