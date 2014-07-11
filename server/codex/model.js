'use strict';

var _ = require('lodash');
var async = require('async');
var util = require('util');
var EventEmitter = require('events').EventEmitter;

function model (modelOptions) {
  var index = modelOptions.index;
  var type = modelOptions.type;
  var refresh = modelOptions.refresh;
  var client = modelOptions.client || require('./client');

  /**
   *
   * @param doc - the document to index, potentially untrusted
   * @param instanceOptions - options affecting this singular model instance
   * @constructor
   * @private
   */
  var Model = function Model_ (doc, instanceOptions) {
    if (!(this instanceof Model_)) {
      return new Model_(doc, instanceOptions);
    }

    // NOTE: doc may come from the client, so don't trust it

    instanceOptions = instanceOptions || {};

    var getSetting = function (setting) {
      return instanceOptions[setting] || modelOptions[setting];
    };

    this.doc = doc || {};

    /**
     * Flag consumers can use to check if an object is a Codex model instance.
     * @type {boolean}
     */
    this.codexModel = true;

    this.index = getSetting('index');
    this.type = getSetting('type');
    this.id = instanceOptions.id;
    this.version = instanceOptions.version;
    this.score = instanceOptions.score;
    this.refresh = getSetting('refresh');
    this.client = getSetting('client');
  };

  util.inherits(Model, EventEmitter);

  /**
   * Instantiate a new Model instance from an elasticsearch request.
   * @param esRequest
   * @returns {Model}
   */
  Model.fromElasticsearchRequest = function (esRequest) {
    return new Model(esRequest.body, {
      id: esRequest.id,
      version: esRequest.version
    });
  };

  /**
   * Instantiate a new Model instance from an elasticsearch hit. A hit is a member of a search response's `hits.hits`
   * array, or the result of a [get request](http://www.elasticsearch.org/guide/en/elasticsearch/reference/1.x/docs-get.html).
   * @param esHit a
   * @returns {Model}
   */
  Model.fromElasticsearchHit = function (esHit) {
    return new Model(esHit._source, {
      id: esHit._id,
      version: esHit._version,
      score: esHit._score,

      // these can be different in multi-index searches
      index: esHit._index,
      type: esHit._type
    });
  };

  // give consumers enough information so they can use the client directly
  Model.index = index;
  Model.type = type;
  Model.client = client;

  // Model.with works in all modern environments, but since `with` is a reserved word, some IDEs complain
  Model['with'] = function (plugin) {
    // this is an initialization function, so it's OK to be synchronous
    return plugin(Model) || Model; // plugins don't have to return the Model if they mutate it
  };

  var initHandler = function (name, defaultFunc) {
    if (Array.isArray(modelOptions[name])) {
      // callers can pass an array to override default handlers
      Model[name] = modelOptions[name];
    } else {
      Model[name] = [defaultFunc];
      if (modelOptions[name]) {
        Model[name].push(modelOptions[name]);
      }
    }
  };

  initHandler('preGet', function preGet (esRequest, callback) {
    callback(null, _.assign({
      index: index,
      type: type
    }, esRequest));
  });

  // We add class methods to instance for convenience
  Model.get = Model.prototype.get = modelOptions.get || function get (esRequest, callback) {
    var preGet0 = function (callback) {
      callback(null, esRequest);
    };
    async.waterfall([preGet0].concat(Model.preGet), function (err, esRequest) {
      if (err) {
        return callback(err);
      }

      client.get(esRequest, function (err, esResponse) {
        if (err) {
          return callback(err);
        }

        var postGet0 = function (callback) {
          callback(null, esResponse);
        };
        var postGet = Model.postGet.map(function (f) {
          return function (esResponse, cb) {
            f(esRequest, esResponse, cb);
          };
        });

        async.waterfall([postGet0].concat(postGet), function (err, esResponse) {
          if (err) {
            return callback(err);
          }

          callback(null, Model.fromElasticsearchHit(esResponse), esResponse);
        });
      });
    });
  };

  initHandler('postGet', function postGet (esRequest, esResponse, callback) {
    callback(null, esResponse);
  });

  initHandler('preSearch', function preSearch (esRequest, callback) {
    callback(null, _.assign({
      index: index,
      type: type,
      version: modelOptions.version !== false
    }, esRequest));
  });

  Model.search = Model.prototype.search = modelOptions.search || function search (params, callback) {
    if (arguments.length < 2) {
      callback = arguments[0];
      params = null;
    }

    var preSearch0 = function (callback) { // seed waterfall
      callback(null, params);
    };

    async.waterfall([preSearch0].concat(Model.preSearch), function (err, esRequest) {
      if (err) {
        return callback(err);
      }

      client.search(esRequest, function (err, esResponse) {
        if (err) {
          return callback(err);
        }

        var postSearch0 = function (callback) {
          callback(null, esResponse);
        };
        var postSearch = Model.postSearch.map(function (f) {
          return function (esResponse, cb) {
            f(esRequest, esResponse, cb);
          };
        });

        async.waterfall([postSearch0].concat(postSearch), function (err, esResponse) {
          if (err) {
            return callback(err);
          }

          var results = esResponse.hits.hits.map(function (hit) {
            return Model.fromElasticsearchHit(hit);
          });

          callback(null, results, esResponse);
        });
      });

      // TODO emit search event for consumers that want to be informed, but don't want to intercept request?
    });
  };

  /**
   * Called after every search request. Useful to filter responses from elasticsearch.
   */
  initHandler('postSearch', function (esRequest, esResponse, callback) {
    callback(null, esResponse);
  });

  initHandler('preDelete', function (esRequest, callback) {
    callback(null, _.assign({
      index: index,
      type: type,
      refresh: refresh
    }, esRequest));
  });

  Model.delete = Model.prototype.delete = function _delete (esRequest, callback) {
    if (arguments.length < 2) {
      callback = arguments[0];
      esRequest = null;
    }

    var preDelete0 = function (callback) {
      callback(null, esRequest);
    };

    async.waterfall([preDelete0].concat(Model.preDelete), function (err, esRequest) {
      if (err) {
        return callback(err);
      }

      if (esRequest.body || esRequest.q) {
        // TODO does this make a difference?
        return client.deleteByQuery(esRequest, callback);
      } else {
        return client.delete(esRequest, callback); // TODO pass new model instance?
      }
    });
  };

  initHandler('preInsert', function preInsert (doc, callback) {
    callback(null, doc);
  });

  /**
   * Index a document into elasticsearch. We call this method `insert` to distinguish the operation (verb) from an
   * elasticsearch index (noun).
   */
  Model.prototype.insert = function insert (params, callback) {
    if (arguments.length < 2) {
      callback = arguments[0];
      params = null;
    }
    var model = this;

    var preInsert0 = function (callback) {
      callback(null, model);
    };

    async.waterfall([preInsert0].concat(Model.preInsert), function (err, model) {
      if (err) {
        return callback(err);
      }

      params = _.assign({ // clients can override preInsert callbacks by passing params
        index: model.index,
        type: model.type,
        id: model.id,
        refresh: model.refresh,
        body: model.doc
      }, params);

      // TODO pass new Model instance?
      return client.index(params, function (err, response) {
        model.emit('insert', err, params, response); // useful for things like releasing write locks
        callback(err, response);
      });
    });
  };

  _.assign(Model, modelOptions.classMethods);
  _.assign(Model.prototype, modelOptions.instanceMethods);

  return Model;
}

module.exports = model;
