'use strict';

var _ = require('lodash');
var async = require('async');
var elasticsearch = require('es');
var settings = require('./settings');
var reindexer = require('./reindexer');
var conf = require('../conf');
var logger = conf.logger;

function moveAlias (alias, newIndex, esClient, callback) {
  logger.info('Moving alias %s to %s', alias, newIndex);
  async.parallel(
    [
      function getCurrentIndex (callback) {
        reindexer.getIndexForAlias(alias, esClient, function (err, index) {
          if (err) {
            callback(err);
            return;
          }

          callback(null, index);
        });
      },
      function enableRefresh (callback) {
        esClient.indices.updateSettings(
          {
            _index: newIndex
          },
          {
            'refresh_interval': '1s' // 1 second is the default
          },
          callback);
      }
    ],
    function (err, results) {
      if (err) {
        callback(err);
        return;
      }
      var currentIndex = results[0];
      var addAction = {
        add: {
          index: newIndex,
          alias: alias
        }
      };

      if (currentIndex) {
        esClient.indices.alias({}, {
          actions: [
            {
              remove: {
                index: currentIndex,
                alias: alias
              }
            },
            addAction
          ]
        }, callback);
      } else {
        // alias doesn't exist, so don't try to remove it
        esClient.indices.alias({}, {
          actions: [addAction]
        }, callback);
      }
    });
}

module.exports = moveAlias;

if (!module.parent) {
  settings.getManagedAliases(function (err, aliases) {
    if (err) {
      throw err;
    }

    var jobs = _.map(aliases, function (alias) {
      var esClient = elasticsearch({
        server: {
          host: conf.es.host,
          port: conf.es.port
        }
      });

      return function (callback) {
        reindexer.getLatestIndex(alias, esClient, function (err, index) {
          if (err) {
            callback(err);
            return;
          }

          moveAlias(alias, index, esClient, callback);
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
