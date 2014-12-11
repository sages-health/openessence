'use strict';

var express = require('express');
//var hidalgo = require('hidalgo');
var cuSum = require('./algorithms/CusumSagesDetector');

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
        var pValues = cuSum.calculateCUSUM(data, 0.5, baseline, guardBand, 0.5, 4);
        res.send({
            pValues: pValues
        });
    });

//  app.post('/ewma');
//
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
