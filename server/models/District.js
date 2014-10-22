'use strict';

var Lock = require('yarnl');
var Boom = require('boom');

var codex = require('../codex');
var conf = require('../conf');

var District = codex.model({
  index: 'district',
  type: 'district',
  refresh: true,
  client: conf.elasticsearch.client,
  preInsert: function (district, callback) {
    district.writeLock.lock(function (err, unlock) {
      if (err) {
        return callback(err);
      } else if (!unlock) {
        return callback(new Error('Failed to acquire district write lock'));
      }

      District.search({
        body: {
          query: {
            'constant_score': {
              filter: {
                term: {
                  'name.raw': district.doc.name
                }
              }
            }
          }
        }
      }, function (err, facilities) {
        if (err) {
          return callback(err);
        }

        if (facilities.length && facilities[0].id !== district.id) {
          return callback(Boom.create(400, 'There\'s already a district with the name ' + district.doc.name, {
            error: 'UniqueConstraintViolation',
            field: 'name',
            value: district.doc.name
          }));
        }

        callback(null, unlock);
      });
    });
  }
}).with(require('../caper-trail').model);

District.prototype.writeLock = District.writeLock = new Lock('district:write', {
  client: conf.redis.client,
  maxAttempts: 100
});

module.exports = District;
