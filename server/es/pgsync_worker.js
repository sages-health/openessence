/**
 * PostgreSQL syncing worker process for a given alias.
 */
'use strict';

var elasticsearch = require('es');
var pg = require('pg.js');

var PgSyncer = require('./pgsyncer');
var conf = require('../conf');
var db = conf.db;
var es = conf.es;
var logger = conf.logger;
var settings = require('./settings');

if (!module.parent) {

  var alias = process.env.ALIAS;

  if (!alias) {
    throw new Error('no process.env.ALIAS');
  }

  pg.connect(
    {
      host: db.host,
      database: db.name,
      user: db.username,
      password: db.password,
      port: db.port
    },
    function (err, client) {
      // third parameter to this func is callback to release connection, but we LISTEN forever

      if (err) {
        logger.error(err.stack);
        process.exit(1);
      }

      var esClient = elasticsearch({
        server: {
          host: es.host,
          port: es.port
        }
      });

      var aliasSettings = settings.loadIndexSettings(alias);

      new PgSyncer({
        pgClient: client,
        esClient: esClient,
        alias: alias,
        type: aliasSettings.type,
        table: aliasSettings.table,
        channels: aliasSettings.channels
      }).sync(function (err) {
          if (err) {
            logger.error(err.stack);
            if (!err.recoverable) {
              process.exit(1);
            }
          }
        }, function (err) {
          if (err) {
            logger.error(err.stack);
          }
        });
    });
}
