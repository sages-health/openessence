'use strict';

var _ = require('lodash');
var async = require('async');

function model (modelOptions) {
  var index = modelOptions.index;
  var type = modelOptions.type;
  var refresh = modelOptions.refresh;
  var client = modelOptions.client || require('./client');

  /**
   *
   * @param doc document to index, potentially untrusted
   * @param instanceOptions options affecting this singular model instance
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

    _.assign(this, doc);

    // Add properties to instance in case any consumers need them
    Object.defineProperty(this, '_', {
      enumerable: false, // separate regular fields from document fields
      configurable: false,
      writable: false,
      value: {
        // this might be useful if each model instance can override index or type
        index: getSetting('index') || instanceOptions._index,
        type: getSetting('type') || instanceOptions._type,

        // these fields are different for every model instance
        id: getSetting('id') || instanceOptions._id,
        version: getSetting('version') || instanceOptions._version,

        refresh: getSetting('refresh'),
        client: getSetting('client'),

        // add class methods to instance for convenience
        get: Model.get,
        search: Model.search,
        delete: Model.delete
      }
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

  Model.get = modelOptions.get || function get (esRequest, callback) {
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

          callback(null, new Model(esResponse._source, esResponse), esResponse);
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
      version: modelOptions.version
    }, esRequest));
  });

  Model.search = modelOptions.search || function search (params, callback) {
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
            return new Model(hit._source, hit);
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

  Model.delete = function _delete (esRequest, callback) {
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

    async.waterfall([preInsert0].concat(Model.preInsert), function (err, doc) {
      if (err) {
        return callback(err);
      }

      params = _.assign({ // clients can override all params
        index: model._.index, // don't use model.index! That comes from the client
        type: model._.type, // happy little fields :)
        id: model._.id,
        refresh: model._.refresh,
        body: _.assign({}, doc) // don't include non-enumerable props, just in case
      }, params);

      // TODO pass new Model instance?
      return client.index(params, callback);//model._.client.index(params, callback);
    });
  };

  _.assign(Model, modelOptions.classMethods);
  _.assign(Model.prototype, modelOptions.instanceMethods);

  return Model;
}

module.exports = model;
