#!/usr/bin/env node

/**
 * Imports OpenESSENCE's Tacbrd data from PostgreSQL into elasticsearch. This script expects no Tacbrd indices to
 * already exist in elasticsearch. Because of this, you should run purge.js to delete the Tacbrd indices first before
 * running this script.
 *
 * TODO make an upgrade script that makes new index, loads data, moves alias, and deletes old index
 */
'use strict';

var Promise = require('bluebird');
var request = Promise.promisifyAll(require('request'));
var settings = require('../dev');

var ELASTICSEARCH_HOSTNAME = settings.ES_HOST || 'localhost';
var ELASTICSEARCH_PORT = settings.ES_PORT || 9200;
var ELASTICSEARCH_URL = 'http://' + ELASTICSEARCH_HOSTNAME + ':' + ELASTICSEARCH_PORT;
var ELASTICSEARCH_ALIAS_URL = ELASTICSEARCH_URL + '/_aliases';

var dbHostname = (function () {
  try {
    return settings.DB_OPTIONS.host || 'localhost';
  } catch (e) {
    // NPE
    console.warn('dev.js: DB_OPTIONS.host not set');
    return 'localhost';
  }
})();

var DB_URL = settings.DB_CONNECTION_STRING || 'jdbc:postgresql://' + dbHostname + ':5432/' + settings.DB_NAME;

function importOtcData () {
  // a better timestamp format would be nice, but be careful of illegal filenames in Windows!
  var otcIndex = 'otc-' + Date.now();

  var otcIndexUrl = ELASTICSEARCH_URL + '/' + otcIndex;
  var otcRiverUrl = ELASTICSEARCH_URL + '/_river/otc-river/_meta';

  return request
    // create OTC index
    .postAsync({
      url: otcIndexUrl,
      json: {
        mappings: {
          sale: {
            properties: {
              product: {
                properties: {
                  upc: {
                    type: 'string',
                    index: 'not_analyzed'
                  },
                  sku: {
                    type: 'string',
                    index: 'not_analyzed'
                  }
                }
              },
              store: {
                properties: {
                  zipCode: {
                    type: 'string',
                    index: 'not_analyzed'
                  },
                  zipExt: {
                    type: 'string',
                    index: 'not_analyzed'
                  }
                }
              }
              // ES infers type of other properties
            }
          }
        }
      }
    })
    .spread(function (response, body) {
      console.log('POST ' + otcIndexUrl + ' returned ' + response.statusCode);
      console.log(body);
    })
    .then(function createOtcAlias () {
      // see http://www.elasticsearch.org/blog/changing-mapping-with-zero-downtime for why we do this
      return request.postAsync({
        url: ELASTICSEARCH_ALIAS_URL,
        json: {
          actions: [
            {
              add: {
                alias: 'otc',
                index: otcIndex
              }
            }
          ]
        }
      });
    })
    .spread(function (response, body) {
      console.log('POST ' + ELASTICSEARCH_ALIAS_URL + ' returned ' + response.statusCode);
      console.log(body);
    })
    .then(function createOtcRiver () {
      return request.putAsync({
          url: otcRiverUrl,
          json: {
            type: 'jdbc',
            jdbc: {
              driver: 'org.postgresql.Driver',
              url: DB_URL,
              user: settings.DB_USERNAME,
              strategy: 'oneshot',
              password: settings.DB_PASSWORD,
              // "foo.bar" tells the JDBC river to create an object "foo" with property "bar"
              sql: 'SELECT sale.id as _id, date, units, is_promotion::boolean as promotion, ' +
                'product.category as "product.category", sale.upc as "product.upc", sku as "product.sku", ' +
                'description as "product.description", type as "product.type", target as "product.target", ' +
                'sale.store_id as "store.id", store.name as "store.name", store.address as "store.address", ' +
                'store.city as "store.city", store.state as "store.state", store.zipcode as "store.zipCode", ' +
                'store.zip_ext as "store.zipExt", store.county as "store.county", store.region as "store.region" ' +
                'FROM otc_sale sale ' +
                'JOIN otc_store store on store.store_id = sale.store_id ' +
                'JOIN otc_product product on product.upc = sale.upc ' +
                'LIMIT 1000'// TODO remove limit after testing
            },
            index: {
              index: 'otc',
              type: 'sale'
            }
          }
        });
    })
    .spread(function (response, body) {
      console.log('PUT ' + otcRiverUrl + ' returned ' + response.statusCode);
      console.log(body);
    });
}

function importErData () {
  var erIndex = 'er-' + Date.now();
  var erIndexUrl = ELASTICSEARCH_URL + '/' + erIndex;
  var erRiverUrl = ELASTICSEARCH_URL + '/_river/er-river/_meta';

  return request
    // create ER index
    .postAsync({
      url: erIndexUrl,
      json: {
        settings: {
          // index block is optional
          analysis: {
            analyzer: {
              // allow searching on sex=female or sex=f
              sex: {
                tokenizer: 'whitespace',
                filter: ['lowercase', 'sex']
              }
            },
            filter: {
              sex: {
                type: 'synonym',
                synonyms: [
                  'm => male',
                  'f => female'
                ]
              }
            }
          }
        },
        mappings: {
          visit: {
            properties: {
              date: {
                type: 'date',
                format: 'dateOptionalTime'
              },
              patient: {
                properties: {
                  sex: {
                    type: 'string',
                    analyzer: 'sex'
                  },
                  zipCode: {
                    type: 'string',
                    index: 'not_analyzed'
                  }
                }
              },
              hospital: {
                properties: {
                  zipCode: {
                    type: 'string',
                    index: 'not_analyzed'
                  }
                }
              }
            }
          }
        }
      }
    })
    .spread(function (response, body) {
      console.log('POST ' + erIndexUrl + ' returned ' + response.statusCode);
      console.log(body);
    })
    .then(function createErAlias () {
      return request.postAsync({
        url: ELASTICSEARCH_ALIAS_URL,
        json: {
          actions: [
            {
              add: {
                alias: 'er',
                index: erIndex
              }
            }
          ]
        }
      });
    })
    .spread(function (response, body) {
      console.log('POST ' + ELASTICSEARCH_ALIAS_URL + ' returned ' + response.statusCode);
      console.log(body);
    })
    .then(function createErRiver () {
      return request.putAsync({
          url: erRiverUrl,
          json: {
            type: 'jdbc',
            jdbc: {
              driver: 'org.postgresql.Driver',
              url: DB_URL,
              user: settings.DB_USERNAME,
              strategy: 'oneshot',
              password: settings.DB_PASSWORD,
              sql: 'SELECT complaint.id as _id, date::date + time::time as "date", ' +
                'chiefcomplaintparsed as "chiefComplaint", dispositioncategory as disposition, ' +
                'zipcode as "patient.zipCode", age as "patient.age", sex as "patient.sex", ' +
                'hospital.id as "hospital.id", hospital.name as "hospital.name", ' +
                'hospital.address as "hospital.address", hospital.zip as "hospital.zipCode" ' +
                'FROM cache_er_chiefcomplaint complaint ' +
                'JOIN hospital on hospital.id = hospital_id ' +
                'LIMIT 1000'// TODO remove limit after testing
            },
            index: {
              index: 'er',
              type: 'visit'
            }
          }
        });
    })
    .spread(function (response, body) {
      console.log('PUT ' + erRiverUrl + ' returned ' + response.statusCode);
      console.log(body);
    });
}

Promise
  .all([importOtcData(), importErData()])
  .then(function () {
    console.log('Data import started. Note that it may take a while to completely load your data.');
  })
  .catch(console.error);

// TODO Twitter data (maybe via Twitter river)
