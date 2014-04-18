'use strict';

var util = require('util');
var _ = require('lodash');
var Model = require('../model');

function PKError (message) {
  Error.call(this, message);
  this.message = message;
  this.name = this.constructor.name;
  this.status = 400;
  Error.captureStackTrace(this, PKError);
}
util.inherits(PKError, Error);

function Diagnosis() {
  Model.call(this, {
    index: 'diagnosis',
    type: 'diagnosis',
    sql: 'SELECT * FROM diagnoses',
    mapping: {
      phoneId: {
        type: 'string',
        index: 'not_analyzed'
      },
      name: {
        type: 'string',
        fields: {
          raw: {
            type: 'string',
            index: 'not_analyzed'
          }
        }
      }
    }
  });
}

util.inherits(Diagnosis, Model);

// Insert a record
Diagnosis.prototype.insert = function (params, callback) {
  if (arguments.length < 2) {
    callback = arguments[0];
    params = null;
  }
  params = _.assign({
    index: this.index,
    type: this.type,
    refresh: true
  }, params);
  var self = this;
  if (params.body && params.body.name){
    var query = 'name.raw:"' + params.body.name + '"';
    var searchParams = _.assign({
      index: this.index,
      type: this.type,
      q: query
    });
    this.client.search(searchParams, function (error, response) {
      if ((response.hits.hits.length === 1 && params.id !== response.hits.hits[0]._id) || response.hits.hits.length > 1) {
        callback(new PKError('Duplicate record for [' + params.body.name + ']!'));
        return;
      }
      self.client.index(params, callback);
    });
  }
  else {
    callback(new PKError('PK [name] missing!'));
  }
};

module.exports = Diagnosis;
