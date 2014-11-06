#!/usr/bin/env node
'use strict';

var bluebird = require('bluebird');
var conf = require('../conf');
var client = conf.elasticsearch.newClient();
var logger = conf.logger;

function clean (done) {
  // This will only delete the indexes that our aliases point to. If your cluster has other indexes, or older versions
  // of fracas indexes, they will be left alone.
  var requests = [
    function (callback) {
      client.indices.delete({index: 'fracas_data'}, callback);
    },
    function (callback) {
      client.indices.delete({index: 'fracas_settings'}, callback);
    }
  ];

  // Use fancy promises so that parallel requests aren't killed if one encounters an error
  bluebird.settle(requests.map(function (r) {
    return bluebird.promisify(r)();
  }))
    .then(function (promiseInspections) {
      var errors = promiseInspections.filter(function (pi) {
        return pi.isRejected();
      }).map(function (pi) {
        return pi.error();
      });

      errors.forEach(function (e) {
        logger.error({err: e}, 'Error deleting index');
      });

      var numSuccesses = requests.length - errors.length;
      logger.info('Successfully deleted %d out of %d indices (%d errors)', numSuccesses, requests.length,
        errors.length);
    })
    .catch(function (e) {
      // this shouldn't ever happen, but in case it does we don't want to swallow errors
      logger.error({err: e}, 'Error deleting indices');
    })
    .finally(function () {
      client.close();
      done();
    });
}

if (module.parent) {
  module.exports = clean;
} else {
  clean(function (err) {
    if (err) {
      logger.error(err);
    }
  });
}
