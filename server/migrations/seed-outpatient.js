/**
 * Seeds elasticsearch with data. Similar to Rails's seeds.rb.
 */
'use strict';

var async = require('async');
var _ = require('lodash');
var conf = require('../conf');
var logger = conf.logger;
var client = conf.elasticsearch.newClient(); // don't use shared connection

function bulkInsert (model, data, params, callback) {
  if (!callback) {
    callback = arguments[2];
    params = null;
  }
  params = params || {};
  params = _.assign({
    index: model.index,
    type: model.type,
    refresh: false,
    body: data.reduce(function (prev, current) { 
      var operation = {index: {}}; //  don't include _index and _type (they're already on model anyway),
      if (params.id) {
        operation.index._id = params.id;
      }
      prev.push(operation);
      prev.push(current);
      return prev;
    }, [])
  }, params);

  client.bulk(params, callback);
}

async.parallel([

  function outpatientVisits (callback) {
    bulkInsert(require('../models/OutpatientVisit'), require('./outpatient-visits.json'), callback);
  }


], function (err) {
  logger.info('Done seeding data');

  if (err) {
    logger.error({err: err}, 'Error seeding data');
  }

  client.indices.refresh({
    index: '_all'
  }, function (err) {
    client.close();

    if (err) {
      logger.error({err: err}, 'Error refreshing indices');
    }

    process.exit(0);
  });
});
