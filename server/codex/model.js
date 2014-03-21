'use strict';

var _ = require('lodash');
var client = require('./client');

function Model () {
  // Bind the inner functions to the model so they can reference the
  // instance properties below
  var instance = this;
  _.forOwn(this.indices, function (value, key, obj) {
    obj[key] = _.bind(value, instance);
  });

  this.index = this.constructor.index || this.constructor.name.toLowerCase();
  this.type = this.constructor.type || this.index;
  this.mapping = this.constructor.mapping;
  this.client = client;
}

// Bulk operations
Model.prototype.bulk = function (params, callback) {
  // Bulk has two modes, but uses the index and type as fallback defaults
  // so they can always be specified
  params = _.assign({
    index: this.index,
    type: this.type
  }, params);
  client.bulk(params, callback);
};

// Delete a single record
Model.prototype.delete = function (params, callback) {
  params = _.assign({
    index: this.index,
    type: this.type
  }, params);
  client.delete(params, callback);
};

// Delete by querying the index
Model.prototype.deleteByQuery = function (params, callback) {
  params = _.assign({
    index: this.index,
    type: this.type
  }, params);
  client.deleteByQuery(params, callback);
};

// Check if a record exists
Model.prototype.exists = function (params, callback) {
  params = _.assign({
    index: this.index,
    type: this.type
  }, params);
  client.exists(params, callback);
};

// Get the contents of a single record
Model.prototype.get = function (params, callback) {
  params = _.assign({
    index: this.index,
    type: this.type
  }, params);
  client.get(params, callback);
};

// Insert a record
Model.prototype.insert = function (params, callback) {
  params = _.assign({
    index: this.index,
    type: this.type
  }, params);
  client.index(params, callback);
};

// Get the contents of multiple records
Model.prototype.mget = function (params, callback) {
  // Mget has two modes - index and type per request, or bulk for a set of ids
  // Only provide default index and type for the latter case
  if(params && params.body.ids) {
    params = _.assign({
      index: this.index,
      type: this.type
    }, params);
  }
  client.mget(params, callback);
};

// Run a query on the index
Model.prototype.search = function (params, callback) {
  params = _.assign({
    index: this.index,
    type: this.type
  }, params);
  client.search(params, callback);
};

// Index manipulation methods
Model.prototype.indices = {};

// Delete the entire index
Model.prototype.indices.delete = function (params, callback) {
  params = _.assign({
    index: this.index
  }, params);
  client.indices.delete(params, callback);
};

// Check if the index exists
Model.prototype.indices.exists = function (params, callback) {
  params = _.assign({
    index: this.index
  }, params);
  client.indices.exists(params, callback);
};

// Check if an alias exists
Model.prototype.indices.existsAlias = function (params, callback) {
  params = _.assign({
    index: this.index
  }, params);
  client.indices.exists(params, callback);
};

// Delete a specific alias
Model.prototype.indices.deleteAlias = function (params, callback) {
  params = _.assign({
    index: this.index
  }, params);
  client.indices.deleteAlias(params, callback);
};

// Delete a specific mapping
Model.prototype.indices.deleteMapping = function (params, callback) {
  params = _.assign({
    index: this.index,
    type: this.type
  }, params);
  client.indices.deleteMapping(params, callback);
};

// Create an alias for the index
Model.prototype.indices.putAlias = function (params, callback) {
  params = _.assign({
    index: this.index
  }, params);
  client.indices.putAlias(params, callback);
};

// Create a mapping for the index and type
Model.prototype.indices.putMapping = function (params, callback) {
  params = _.assign({
    index: this.index,
    type: this.type,
    body: this.mapping
  }, params);
  client.indices.putMapping(params, callback);
};

module.exports = Model;
