'use strict';

var _ = require('lodash');

/**
 * Represents an elasticsearch index
 * @param name name of the index
 * @param client instance of elasticsearch.js client
 * @param options as specified by http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/indices-create-index.html
 * @constructor
 */
function Index (name, client, options) {
  this.name = name;
  this.client = client;
  this.options = options;
}

/**
 * Create the index
 */
Index.prototype.create = function (params, callback) {
  if (arguments.length < 2) {
    callback = arguments[0];
    params = null;
  }

  params = _.assign({
    index: this.name,
    body: this.options
  }, params);
  this.client.indices.create(params, callback);
};

/**
 * Delete the entire index
 * TODO Alias subclass that calls deleteAlias
 */
Index.prototype.delete = function (params, callback) {
  if (arguments.length < 2) {
    callback = arguments[0];
    params = null;
  }
  params = _.assign({
    index: this.name
  }, params);
  this.client.indices.delete(params, callback);
};

/**
 * Check if the index exists
 */
Index.prototype.exists = function (params, callback) {
  if (arguments.length < 2) {
    callback = arguments[0];
    params = null;
  }
  params = _.assign({
    index: this.name
  }, params);
  this.client.indices.exists(params, callback);
};

// Create an alias for the index
Index.prototype.putAlias = function (params, callback) {
  if (arguments.length < 2) {
    callback = arguments[0];
    params = null;
  }
  params = _.assign({
    index: this.name
  }, params);
  this.client.indices.putAlias(params, callback);
};

Index.prototype.putMapping = function (params, callback) {
  if (arguments.length < 2) {
    callback = arguments[0];
    params = null;
  }
  params = _.assign({
    index: this.name
  }, params);
  this.client.indices.putMapping(params, callback);
};

module.exports = Index;
