#!/usr/bin/env node

/**
 * Deletes all Tacbrd data from elasticsearch.
 */
'use strict';

var _ = require('lodash');
var Promise = require('bluebird');
var request = Promise.promisifyAll(require('request'));
var settings = require('../dev');

var ELASTICSEARCH_HOSTNAME = settings.ES_HOST || 'localhost';
var ELASTICSEARCH_PORT = settings.ES_PORT || 9200;
var ELASTICSEARCH_URL = 'http://' + ELASTICSEARCH_HOSTNAME + ':' + ELASTICSEARCH_PORT;

Promise
  .all([
    // delete river types, but keep river index since it's used by all rivers
    // delete rivers first, just so we don't have a race condition between the river trying to ingest data and our
    // deleting the indices
    request.delAsync(ELASTICSEARCH_URL + '/_river/er-river'),
    request.delAsync(ELASTICSEARCH_URL + '/_river/otc-river')
  ])
  .then(function getIndices() {
    return request
      // can also GET /_alias/er*,otc* but that doesn't buy us much
      .getAsync(ELASTICSEARCH_URL + '/_aliases')
      .spread(function (response, body) {
        console.log('GET ' + ELASTICSEARCH_URL + '/_aliases ' + response.statusCode);
        console.log(body);

        return Object.keys(JSON.parse(body));
      })
      .then(function findIndices (indices) {
        var erIndex = (function (indices) {
          var erIndices = _.filter(indices, function (index) {
            return (/^er-/).test(index);
          });
          if (erIndices.length > 1) {
            throw new Error('More than one er- index found');
          } else if (erIndices.length === 0) {
            console.warn('No er- index found');
            return null;
          } else {
            console.log('ER index is named ' + erIndices[0]);
            return erIndices[0];
          }
        })(indices);

        var otcIndex = (function (indices) {
          var otcIndices = _.filter(indices, function (index) {
            return (/^otc-/).test(index);
          });
          if (otcIndices.length > 1) {
            throw new Error('More than one otc- index found');
          } else if (otcIndices.length === 0) {
            console.warn('No otc- index found');
            return null;
          } else {
            console.log('OTC index is named ' + otcIndices[0]);
            return otcIndices[0];
          }
        })(indices);

        return {
          er: erIndex,
          otc: otcIndex
        };
      });
  })
  .then(function deleteIndices (indices) {

    function deleteIndex (index) {
      return request
        .delAsync(ELASTICSEARCH_URL + '/' + index)
        .spread(function (response, body) {
          console.log('DELETE /' + index + ' returned ' + response.statusCode);
          console.log(body);
        });
    }

    function deleteErIndex (index) {
      if (!index) {
        console.warn('No ER index, so not deleting');
        return null;
      }
      return deleteIndex(index);
    }

    function deleteOtcIndex (index) {
      if (!index) {
        console.warn('No OTC index, so not deleting');
        return null;
      }
      return deleteIndex(index);
    }

    return Promise.all([
      deleteErIndex(indices.er),
      deleteOtcIndex(indices.otc)
    ]);
  });
