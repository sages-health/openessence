'use strict';

var codex = require('../codex');
var conf = require('../conf');
var _ = require('lodash');

var Locale = codex.model({
  index: 'locale',
  type: 'locale',
  refresh: true,
  client: conf.elasticsearch.client,
  classMethods: {

    getLocaleByLngNS: function (lng, ns, esRequest, callback) {
      if (!callback) {
        callback = arguments[2];
        esRequest = null;
      }

      esRequest = _.assign({
        body: {
          query: {
            filtered: {
              query: {
                match: {lng: lng}
              },
              filter: {
                term: {ns: ns}
              }
            }
          }
        }
      }, esRequest);

      return Locale.search(esRequest, function (err, response) {
        if (err) {
          return callback(err);
        }

        if (response.length > 1) {
          return callback(new Error('Multiple translation for lng:' + lng + ' and ns:' + ns), null);
        } else if (response.length === 0) {
          return callback(null, null);
        } else {
          return callback(null, response[0].doc);
        }
      });
    }
  }
}).with(require('../caper-trail').model);

module.exports = Locale;
