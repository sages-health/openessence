'use strict';

var Boom = require('boom');
var Lock = require('yarnl');
var codex = require('../codex');
var conf = require('../conf');

var Disposition = codex.model({
  index: 'disposition',
  type: 'disposition',
  refresh: true,
  client: conf.elasticsearch.client,
  preInsert: function (disposition, callback) {
    disposition.writeLock.lock(function (err, unlock) {
      if (err) {
        return callback(err);
      } else if (!unlock) {
        return callback(new Error('Failed to acquire district write lock'));
      }

      Disposition.search({
        body: {
          query: {
            'constant_score': {
              filter: {
                term: {
                  'name.raw': disposition.doc.name
                }
              }
            }
          }
        }
      }, function (err, facilities) {
        if (err) {
          return callback(err);
        }

        if (facilities.length && facilities[0].id !== disposition.id) {
          return callback(Boom.create(400, 'There\'s already a district with the name ' + disposition.doc.name, {
            error: 'UniqueConstraintViolation',
            field: 'name',
            value: disposition.doc.name
          }));
        }

        callback(null, unlock);
      });
    });
  }
}).with(require('../caper-trail').model);

Disposition.prototype.writeLock = Disposition.writeLock = new Lock('disposition:write', {
  client: conf.redis.client,
  maxAttempts: 100
});

module.exports = Disposition;
