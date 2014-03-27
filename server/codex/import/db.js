'use strict';

var conf = require('../../conf');
var client = require('../client');

function createRiver (model, callback) {
  if (!model.sql) {
    callback(new Error('SQL to get data is not defined on the model'));
    return;
  }

  client.create({
    index: '_river',
    type: model.index + '-river',
    id: '_meta',
    body: {
      type: 'jdbc',
      jdbc: {
        driver: conf.db.driver,
        url: conf.db.url,
        user: conf.db.user,
        password: conf.db.password,
        strategy: 'oneshot',
        sql: model.sql,
        index: model.index,
        type: model.type,
        'index_settings': model.indexSettings,
        'type_mapping': model.mapping
      }
    }
  }, callback);
}

module.exports = createRiver;
