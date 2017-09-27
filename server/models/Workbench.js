var Boom = require('boom');

'use strict';
var Lock = require('yarnl');
var codex = require('../codex');
var conf = require('../conf');

var Workbench = codex.model({
  index: 'workbench',
  type: 'workbench',
  refresh: true, // TODO pass refresh=true from client
  client: conf.elasticsearch.client,
  preInsert: function (workbench, callback) {
    workbench.writeLock.lock(function (err, unlock) {
      if (err) {
        return callback(err);
      } else if (!unlock) {
        return callback(new Error('Failed to acquire workbench write lock'));
      }

      // enforce unique constraint on name
      Workbench.search({
        body: {
          query: {
            'constant_score': {
              filter: {
                term: {
                  'name.raw': workbench.doc.name
                }
              }
            }
          }
        }
      }, function (err, workbenches) {
        if (err) {
          unlock();
          return callback(err);
        }

        if (workbenches.length && workbenches[0].id !== workbench.id) {
          unlock();
          return callback(Boom.create(400, 'There\'s already a workbench with the name ' + workbench.doc.name, {
            error: 'UniqueConstraintViolation',
            field: 'name',
            value: workbench.doc.name
          }));
        }

        workbench.once('insert', unlock);
        callback(null, workbench);
      });
    });
  }
}).with(require('../caper-trail').model);

Workbench.prototype.writeLock = Workbench.writeLock = new Lock('workbench:write', {
  client: conf.redis.client,
  maxAttempts: 100
});

module.exports = Workbench;
