'use strict';

var async = require('async');
var models = require('../models');
var logger = require('../../conf').logger;

function importData (strategy, callback) {
  async.map(models, function (m, cb) {
    logger.info('Importing ' + m.constructor.name);

    strategy(m, cb);
  }, function (err) {
    logger.info('Finished importing data into elasticsearch');
    callback(err);
  });
}

module.exports = importData;
