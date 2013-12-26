'use strict';

var _ = require('lodash');
var async = require('async');
var elasticsearch = require('es');
var reindexer = require('./reindexer');
var settings = require('./settings');
var conf = require('../conf');
var logger = conf.logger;

function Cleaner (alias, esClient) {
  if (!(this instanceof Cleaner)) {
    return new Cleaner(alias, esClient);
  }

  this.alias = alias;
  this.esClient = esClient;
}

module.exports = Cleaner;

/**
 * This function deletes all rivers corresponding to old indices.
 * Note that it will *not* delete an old river if it doesn't have a corresponding index.
 * If you want to delete all old rivers, drop the index manually. This will of course also delete newer
 * rivers, but they'll be recreated next time a re-index is run. Try not to delete a JDBC river while it's
 * running a job though. See https://groups.google.com/forum/#!topic/elasticsearch/WvtnHZlPqsY
 */
Cleaner.prototype.deleteOldRivers = function deleteOldRivers (callback) {
  var cleaner = this;
  reindexer.getOldIndices(this.alias, this.esClient, function (err, indices) {
    if (err) {
      callback(err);
      return;
    }

    async.each(indices, function (index, callback) {
      reindexer.waitUntilJdbcRiverInactive(index, cleaner.esClient, function (err) {
        if (err) {
          callback(err);
          return;
        }
        var name = reindexer.getRiverNameFromIndexName(index);

        cleaner.esClient.delete({
          _index: '_river',
          _type: name
        }, function (err, result) {
          if (err) {
            if (err.statusCode === 404) {
              logger.info('River %s not found. It may have already been deleted', name);
              callback(null, result);
              return;
            } else {
              callback(err);
              return;
            }
          }

          logger.info('Deleted river %s', name);
          callback(null, result);
        });
      });
    }, callback);
  });
};

Cleaner.prototype.deleteOldIndices = function deleteOldIndicesInParallel (callback) {
  logger.info('Deleting old %s indices', this.alias);

  var cleaner = this;
  reindexer.getOldIndices(this.alias, this.esClient, function (err, indices) {
    var jobs = _.map(indices, function (index) {
      return function (callback) {
        logger.info('Deleting index %s', index);
        cleaner.esClient.indices.deleteIndex({
          _index: index
        }, callback);
      };
    });

    // deleting indices is fast in elasticsearch, but a little throttling never hurt anyone
    async.parallelLimit(jobs, 3, callback);
  });
};

if (!module.parent) {
  settings.getManagedAliases(function (err, aliases) {
    if (err) {
      throw err;
    }

    var esClient = elasticsearch({
      server: {
        host: conf.es.host,
        port: conf.es.port
      }
    });

    var jobs = _.map(aliases, function (alias) {
      return function (callback) {
        var cleaner = new Cleaner(alias, esClient);
        cleaner.deleteOldRivers(function (err) {
          if (err) {
            callback(err);
            return;
          }

          cleaner.deleteOldIndices(callback);
        });
      };
    });

    async.parallel(jobs, function (err) {
      if (err) {
        throw err;
      }
    });
  });
}


