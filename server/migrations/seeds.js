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
    body: data.reduce(function (prev, current) { // add operation before every piece of data
      // push to save memory over concat
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
  function dashboards (callback) {
    var Dashboard = require('../models/Dashboard');
    new Dashboard(require('./dashboards.json')[0]).insert({id: 'default'}, callback);
  },

  function dateShift (callback) {
    client.index({
      index: 'date-shift',
      type: 'shift',
      id: '1', // so it's easy to get
      body: {
        // this should be changed if the dates in outpatient-visits.json are ever changed
        date: new Date('2010', '03', '16') // Apr. 16, 2010
      }
    }, callback);
  },

  function diagnoses (callback) {
    bulkInsert(require('../models/Diagnosis'), require('./diagnosis.json'), callback);
  },

  function districts (callback) {
    var District = require('../models/District');
    var geoJson = require('./nebraska.json');
    var features = geoJson.features.reduce(function (previous, current) {
      previous.push({
        name: current.properties.CTYNAMEUP,
        geometry: {
          type: 'polygon', // elasticsearch uses lowercase
          coordinates: current.geometry.coordinates
        }
      });
      return previous;
    }, []);
    bulkInsert(District, features, callback);
  },

  function outpatientVisits (callback) {
    bulkInsert(require('../models/OutpatientVisit'), require('./outpatient-visits.json'), callback);
  },

  function symptoms (callback) {
    bulkInsert(require('../models/Symptom'), require('./symptom.json'), callback);
  },

  function syndrome (callback) {
    bulkInsert(require('../models/Syndrome'), require('./syndrome.json'), callback);
  },

  function dischargeType (callback) {
    bulkInsert(require('../models/Discharge'), require('./discharge-type.json'), callback);
  },

  function visitType (callback) {
    bulkInsert(require('../models/VisitType'), require('./visit-type.json'), callback);
  },

  function visualizations (callback) {
    bulkInsert(require('../models/Visualization'), require('./visualizations.json'), callback);
  }
], function (err) {
  logger.info('Done seeding data');

  if (err) {
    logger.error({err: err}, 'Error seeding data');
  }

  client.indices.refresh({
    index: '_all' // TODO limit to only codex-managed indices
  }, function (err) {
    client.close();

    if (err) {
      logger.error({err: err}, 'Error refreshing indices');
    }

    // FIXME this shouldn't be necessary
    process.exit(0);
  });
});
