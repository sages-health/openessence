'use strict';

var _ = require('lodash');
var changeCase = require('change-case');
var errors = require('./errors');
var Index = require('./es-index');

function Model (options) {
  options = _.assign({
    // we use param-case since that's the de facto REST standard for resources, even if elasticsearch uses snake_case
    index: this.constructor.INDEX || changeCase.paramCase(this.constructor.name)
  }, options);

  this.type = options.type || this.constructor.TYPE || this.index;
  this.client = options.client || require('./client'); // delay instantiating client
  this.index = _.isString(options.index) ? new Index(options.index, this.client) : options.index;
}

/**
 * Called when constraints on a record need to be checked. The default implementation does no constraint checking.
 * Currently only called on index requests.
 */
Model.prototype.checkConstraints = function (params, callback) {
  callback(null);
};

// Bulk operations
Model.prototype.bulk = function (params, callback) {
  if (arguments.length < 2) {
    callback = arguments[0];
    params = null;
  }
  // Bulk has two modes, but uses the index and type as fallback defaults
  // so they can always be specified
  params = _.assign({
    index: this.index.name,
    type: this.type,
    refresh: true // we have a very low write volume, so we favor consistency over speed by default
  }, params);
  this.client.bulk(params, callback);
};

// Delete a single record
Model.prototype.delete = function (params, callback) {
  if (arguments.length < 2) {
    callback = arguments[0];
    params = null;
  }
  params = _.assign({
    index: this.index.name,
    type: this.type,
    refresh: true
  }, params);
  this.client.delete(params, callback);
};

// Delete by querying the index
Model.prototype.deleteByQuery = function (params, callback) {
  if (arguments.length < 2) {
    callback = arguments[0];
    params = null;
  }
  params = _.assign({
    index: this.index.name,
    type: this.type,
    refresh: true
  }, params);
  this.client.deleteByQuery(params, callback);
};

// Check if a record exists
Model.prototype.exists = function (params, callback) {
  if (arguments.length < 2) {
    callback = arguments[0];
    params = null;
  }
  params = _.assign({
    index: this.index.name,
    type: this.type
  }, params);
  this.client.exists(params, callback);
};

// Get the contents of a single record
Model.prototype.get = function (params, callback) {
  if (arguments.length < 2) {
    callback = arguments[0];
    params = null;
  }
  params = _.assign({
    index: this.index.name,
    type: this.type
  }, params);
  this.client.get(params, callback);
};

// Insert a record
Model.prototype.insert = function (params, callback) {
  if (arguments.length < 2) {
    callback = arguments[0];
    params = null;
  }
  params = _.assign({
    index: this.index.name,
    type: this.type,
    refresh: true
  }, params);

  this.checkConstraints(params, function (err, failure) {
    if (err) {
      callback(err);
      return;
    }

    if (failure) {
      callback(new errors.ConstraintError(failure.name, failure.message));
    } else {
      // all good, we can proceed with the write
      this.client.index(params, callback);
    }
  }.bind(this));
};

// Get the contents of multiple records
Model.prototype.mget = function (params, callback) {
  if (arguments.length < 2) {
    callback = arguments[0];
    params = null;
  }
  // Mget has two modes - index and type per request, or bulk for a set of ids
  // Only provide default index and type for the latter case
  if (params && params.body.ids) {
    params = _.assign({
      index: this.index.name,
      type: this.type
    }, params);
  }
  this.client.mget(params, callback);
};

// Run a query on the index
Model.prototype.search = function (params, callback) {
  if (arguments.length < 2) {
    callback = arguments[0];
    params = null;
  }
  params = _.assign({
    index: this.index.name,
    type: this.type
  }, params);
  this.client.search(params, callback);
};

module.exports = Model;
