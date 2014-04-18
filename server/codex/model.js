'use strict';

var util = require('util');
var _ = require('lodash');
var changeCase = require('change-case');

function PrimaryKeyViolcationError (message) {
  Error.call(this, message);
  this.message = message;
  this.name = this.constructor.name;
  this.status = 400;
  Error.captureStackTrace(this, PrimaryKeyViolcationError);
}
util.inherits(PrimaryKeyViolcationError, Error);


function Model (options) {
  options = _.assign({
    // we use param-case since that's the de facto REST standard for resources, even if elasticsearch uses snake_case
    index: this.constructor.INDEX || changeCase.paramCase(this.constructor.name),
    // type depends on index
    mapping: this.constructor.MAPPING,
    indexSettings: this.constructor.INDEX_SETTINGS,
    pk: this.constructor.PK,
    sql: this.constructor.SQL,
    transformMapping: function (mapping) {
      var mappings = {};
      mappings[this.type] = mapping;
      return mappings; // this probably should be async, but we'll implement that when we need it
    }.bind(this)
  }, options);

  // Bind the inner functions to the model so they can reference the
  // instance properties below
  var instance = this;
  _.forOwn(this.indices, function (value, key, obj) {
    obj[key] = _.bind(value, instance);
  });

  this.index = options.index;
  this.type = options.type || this.constructor.TYPE || this.index;

  /**
   * Function called before a mapping is submitted to elasticsearch. It's return value is the mapping that
   * should be sent to elasticsearch.
   */
  this.transformMapping = options.transformMapping;

  // don't store original mapping and risk forgetting to call transformMapping()
  this.mapping = this.transformMapping(options.mapping);

  this.indexSettings = options.indexSettings;
  this.client = options.client || require('./client'); // delay instantiating client

  /**
   * SQL to use when importing this model's data from a relational database
   * @type {string}
   */
  this.sql = options.sql;
  this.pk = options.pk;
}

// Bulk operations
Model.prototype.bulk = function (params, callback) {
  if (arguments.length < 2) {
    callback = arguments[0];
    params = null;
  }
  // Bulk has two modes, but uses the index and type as fallback defaults
  // so they can always be specified
  params = _.assign({
    index: this.index,
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
    index: this.index,
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
    index: this.index,
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
    index: this.index,
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
    index: this.index,
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
    index: this.index,
    type: this.type,
    refresh: true
  }, params);
  var self = this;
  // if pk (= single column name for pk) //TODO: allow multi-column pk...
  if (this.pk && this.pk.length > 0) {
    var query = this.pk + ':' + params.body[this.pk];
    var searchParams = _.assign({
      index: this.index,
      type: this.type,
      q: query
    });
    this.client.search(searchParams, function (error, response) {
      if ((response.hits.hits.length == 1 && params.id != response.hits.hits[0]._id) || response.hits.hits.length > 1) {
        callback(new PrimaryKeyViolcationError('Duplicate record! [' + query + ']'));
        return;
      }
      self.client.index(params, callback);
    });
  }
  else {
    self.client.index(params, callback);
  }


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
      index: this.index,
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
    index: this.index,
    type: this.type
  }, params);
  this.client.search(params, callback);
};

// Index manipulation methods
Model.prototype.indices = {};

// Create a new index
Model.prototype.indices.create = function (params, callback) {
  if (arguments.length < 2) {
    callback = arguments[0];
    params = null;
  }

  params = _.assign({
    index: this.index,
    body: {
      settings: this.indexSettings,
      mappings: this.mapping
      // aliases might also be useful here once we move to 1.1.0
    }
  }, params);
  this.client.indices.create(params, callback);
};

// Delete the entire index
Model.prototype.indices.delete = function (params, callback) {
  if (arguments.length < 2) {
    callback = arguments[0];
    params = null;
  }
  params = _.assign({
    index: this.index
  }, params);
  this.client.indices.delete(params, callback);
};

// Check if the index exists
Model.prototype.indices.exists = function (params, callback) {
  if (arguments.length < 2) {
    callback = arguments[0];
    params = null;
  }
  params = _.assign({
    index: this.index
  }, params);
  this.client.indices.exists(params, callback);
};

// Check if an alias exists
Model.prototype.indices.existsAlias = function (params, callback) {
  if (arguments.length < 2) {
    callback = arguments[0];
    params = null;
  }
  params = _.assign({
    index: this.index
  }, params);
  this.client.indices.exists(params, callback);
};

// Delete a specific alias
Model.prototype.indices.deleteAlias = function (params, callback) {
  if (arguments.length < 2) {
    callback = arguments[0];
    params = null;
  }
  params = _.assign({
    index: this.index
  }, params);
  this.client.indices.deleteAlias(params, callback);
};

// Delete a specific mapping
Model.prototype.indices.deleteMapping = function (params, callback) {
  if (arguments.length < 2) {
    callback = arguments[0];
    params = null;
  }
  params = _.assign({
    index: this.index,
    type: this.type
  }, params);
  this.client.indices.deleteMapping(params, callback);
};

// Create an alias for the index
Model.prototype.indices.putAlias = function (params, callback) {
  if (arguments.length < 2) {
    callback = arguments[0];
    params = null;
  }
  params = _.assign({
    index: this.index
  }, params);
  this.client.indices.putAlias(params, callback);
};

// Create a mapping for the index and type
Model.prototype.indices.putMapping = function (params, callback) {
  if (arguments.length < 2) {
    callback = arguments[0];
    params = null;
  }
  params = _.assign({
    index: this.index,
    type: this.type,
    body: this.mapping
  }, params);
  this.client.indices.putMapping(params, callback);
};

// http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/indices-update-settings.html
Model.prototype.indices.putSettings = function (params, callback) {
  if (arguments.length < 2) {
    callback = arguments[0];
    params = null;
  }
  params = _.assign({
    index: this.index,
    type: this.type,
    body: this.indexSettings
  }, params);
  this.client.indices.putSettings(params, callback);
};

module.exports = Model;
