'use strict';

var pg = require('pg.js');
var db = require('../../../server/conf').db;

exports.hasLock = function hasLock (id, callback) {
  pg.connect(
    {
      host: db.host,
      database: db.name,
      user: db.username,
      password: db.password,
      port: db.port
    },
    function (err, client, done) {
      if (err) {
        callback(err);
        return;
      }

      var sql = 'select * from pg_locks where locktype = \'advisory\' and granted = true and objid = $1';
      client.query(sql, [id], function (err, result) {
        done();
        if (err) {
          callback(err);
          return;
        }

        callback(null, result.rows.length > 0);
      });
    });
};
