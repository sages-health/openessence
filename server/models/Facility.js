'use strict';

var Lock = require('yarnl');
var Boom = require('boom');

var codex = require('../codex');
var conf = require('../conf');

var Facility = codex.model({
  index: 'facility',
  type: 'facility',
  refresh: true,
  client: conf.elasticsearch.client,
  preInsert: function (facility, callback) {
    facility.writeLock.lock(function (err, unlock) {
      if (err) {
        return callback(err);
      } else if (!unlock) {
        return callback(new Error('Failed to acquire facility write lock'));
      }

      Facility.search({
        body: {
          query: {
            'constant_score': {
              filter: {
                term: {
                  'name.raw': facility.doc.name
                }
              }
            }
          }
        }
      }, function (err, facilities) {
        if (err) {
          return callback(err);
        }

        if (facilities.length && facilities[0].id !== facility.id) {
          return callback(Boom.create(400, 'There\'s already a facility with the name ' + facility.doc.name, {
            error: 'UniqueConstraintViolation',
            field: 'name',
            value: facility.doc.name
          }));
        }

        callback(null, unlock);
      });
    });
  }
}).with(require('../caper-trail').model);

Facility.prototype.writeLock = Facility.writeLock = new Lock('facility:write', {
  client: conf.redis.client,
  maxAttempts: 100
});

module.exports = Facility;
