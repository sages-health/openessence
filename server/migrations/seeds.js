/**
 * Seeds elasticsearch with data. Similar to Rails's seeds.rb.
 */
'use strict';

var async = require('async');
var elasticsearch = require('elasticsearch');
var _ = require('lodash');
var conf = require('../conf');
var logger = conf.logger;

// don't use shared connection
var client = new elasticsearch.Client(_.clone(conf.elasticsearch));

function bulkInsert (Model, data, callback) {
  var model = new Model({client: client});
  model.bulk({
    refresh: false,
    body: data.reduce(function (prev, current) { // add operation before every piece of data
      // push to save memory over concat
      prev.push({index: {}}); //  don't include _index and _type (they're already on model anyway),
      prev.push(current);
      return prev;
    }, [])
  }, callback);
}

async.parallel([
  function diagnoses (callback) {
    bulkInsert(require('../models/Diagnosis'), [
      {name: 'Malaria', phoneId: 'm'},
      {name: 'Cholera', phoneId: 'c'}
    ], callback);
  },

  function districts (callback) {
    bulkInsert(require('../models/District'), [
      {name: 'Alphaville', phoneId: 'd1'},
      {name: 'Beta quadrant', phoneId: 'd2'}
    ], callback);
  },

  function outpatientVisits (callback) {
    bulkInsert(require('../models/OutpatientVisit'), require('./outpatient-visits.json'), callback);
  },

  function symptoms (callback) {
    bulkInsert(require('../models/Symptom'), [
      {name: 'Cough', phoneId: 'c'},
      {name: 'Fever', phoneId: 'f'}
    ], callback);
  },

  function visualizations (callback) {
    bulkInsert(require('../models/Visualization'), require('./visualizations.json'), callback);
  }
], function (err) {
  logger.info('Done seeding data');

  if (err) {
    logger.error({err: err}, 'Error seeding data');
  }

  client.close();

  // FIXME this shouldn't be necessary
  process.exit(0);
});
