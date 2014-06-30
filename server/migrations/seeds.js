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

  function diagnoses (callback) {
    bulkInsert(require('../models/Diagnosis'), [
      {name: 'Malaria', phoneId: 'm'},
      {name: 'Cholera', phoneId: 'c'}
    ], callback);
  },

  function districts (callback) {
    var District = require('../models/District');
    async.parallel([
      function geometry (callback) {
        var geoJson = require('./cityville_import.json');
        var districts = geoJson.features.reduce(function (previous, current) {
          previous.push({
            name: current.properties.district,
            geometry: {
              type: 'polygon', // elasticsearch uses lowercase
              coordinates: current.geometry.coordinates
            }
          });
          return previous;
        }, []);

        bulkInsert(District, districts, callback);
      },
      function (callback) {
        bulkInsert(District, [
          {name: 'Alphaville', phoneId: 'd1'},
          {name: 'Beta quadrant', phoneId: 'd2'}
        ], callback);
      }
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