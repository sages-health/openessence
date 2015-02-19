'use strict';

var async = require('async');
var esErrors = require('elasticsearch').errors;

function Controller(Model, options) {
  if (!(this instanceof Controller)) { // enable codex.controller(...) in addition to  new codex.controller(...)
    return new Controller(Model, options);
  }

  options = options || {};

  this.Model = Model;

  /**
   * Codex middleware uses Controllers to instantiate express middleware. Use this callback for more fine-grained
   * control over the created middleware, for example, adding custom end points.
   * @param app - express app
   * @return middleware to use, if a falsey value is returned, then the passed in middleware is used so that consumers
   * may modify the middleware in place
   */
  this.middleware = options.middleware || function (app) {
    return app;
  };

  var initCodexReq = function (req) {
    if (req.codex) {
      return;
    }

    req.codex = {
      // Cache of model instances. This is not designed to replace a DAO-level cache. Rather, it should be used so that
      // you don't need to call Model.get multiple times in the same request. For example, multiple preInsert callbacks
      // might need the same corresponding preexisting model instance from elasticsearch.
      instances: {},

      // Get a model instance, fulfilling the request from our cache if possible.
      get: function (esRequest, callback) {
        var id = esRequest.id;
        var instance = req.codex.instances[id]; // can be undefined if we cache the fact that this doc doesn't exist
        var version = esRequest.version;
        var noVersion = !version && version !== 0;

        if (id in req.codex.instances && (!instance || noVersion || version === instance.version)) {
          return callback(null, instance);
        }

        Model.get(esRequest, function (err, instance) {
          if (err && !(err instanceof esErrors.NotFound)) {
            return callback(err);
          }

          req.codex.instances[id] = instance;
          callback(null, instance);
        });
      }
    };
  };

  var defaultSearch = function (req, res, next) {
    initCodexReq(req);

    var preSearch = this.preSearch.map(function (f) {
      // preSearch expects 2 args but only returns 1, so partially apply to make it work w/ waterfall
      return function (esRequest, cb) {
        f(req, esRequest, cb);
      };
    });

    var controller = this;
    async.waterfall(preSearch, function (err, esRequest) {
      if (err) {
        return next(err);
      }

      controller.Model.search(esRequest, function (err, results, esResponse) {
        if (err) {
          return next(err);
        }

        var postSearch0 = function (callback) {
          // start with an empty response, first postSearch callback typically replaces response with its own anyway
          callback(null, {});
        };
        var postSearchers = controller.postSearch.map(function (f) {
          // postSearch callbacks are passed the original request, the response from elasticsearch, our (tentative)
          // JSON response to the client, and a callback
          return function (response, cb) {
            f(req, esResponse, response, cb);
          };
        });

        async.waterfall([postSearch0].concat(postSearchers), function (err, esResponse) {
          if (err) {
            return next(err);
          }

          res.json(esResponse);
        });
      });
    });
  }.bind(this);

  var defaultGet = function (req, res, next) {
    initCodexReq(req);

    var preGet = this.preGet.map(function (f) {
      return function (esRequest, cb) {
        f(req, esRequest, cb);
      };
    });

    var controller = this;
    async.waterfall(preGet, function (err, esRequest) {
      if (err) {
        return next(err);
      }

      controller.Model.get(esRequest, function (err, instance, esResponse) {
        if (err) {
          return next(err);
        }

        req.codex.instance = instance;

        var postGet0 = function (callback) {
          callback(null, {});
        };
        var postGetters = controller.postGet.map(function (f) {
          return function (response, cb) {
            f(req, esResponse, response, cb);
          };
        });

        async.waterfall([postGet0].concat(postGetters), function (err, esResponse) {
          if (err) {
            return next(err);
          }

          // esResponse has been filtered by postGet
          res.json(esResponse);
        });
      });
    });
  }.bind(this);

  var defaultInsert = function (req, res, next) {
    initCodexReq(req);

    var preInsert = this.preInsert.map(function (f) {
      return function (esRequest, cb) {
        f(req, esRequest, cb);
      };
    });

    var controller = this;
    async.waterfall(preInsert, function (err, esRequest) {
      if (err) {
        return next(err);
      }

      // TODO refresh if &refresh=true, requires queuing writes to prevent DOSing
      var model = controller.Model.fromElasticsearchRequest(esRequest);
      model.insert(esRequest, function (err, esResponse) {
        if (err) {
          return next(err);
        }
        var created = esResponse.created;

        var postInsert0 = function (callback) {
          callback(null, esResponse);
        };
        var postInserters = controller.postInsert.map(function (f) {
          return function (esResponse, cb) {
            f(req, esResponse, cb);
          };
        });

        async.waterfall([postInsert0].concat(postInserters), function (err, esResponse) {
          if (err) {
            return next(err);
          }

          if (created) {
            res.status(201);
          } else {
            res.status(200);
          }

          // esResponse has been filtered by postInsert
          res.json(esResponse);
        });
      });
    });
  }.bind(this);

  var defaultDelete = function (req, res, next) {
    initCodexReq(req);

    var preDelete = this.preDelete.map(function (f) {
      return function (esRequest, cb) {
        f(req, esRequest, cb);
      };
    });

    var controller = this;
    async.waterfall(preDelete, function (err, esRequest) {
      if (err) {
        return next(err);
      }

      controller.Model.delete(esRequest, function (err, esResponse) {
        if (err) {
          return next(err);
        }

        var found = esResponse.found;
        var postDelete0 = function (callback) {
          callback(null, esResponse);
        };
        var postDeleters = controller.postDelete.map(function (f) {
          return function (esResponse, cb) {
            f(req, esResponse, cb);
          };
        });

        async.waterfall([postDelete0].concat(postDeleters), function (err, esResponse) {
          if (err) {
            return next(err);
          }

          if (found) {
            res.status(200);
          } else {
            res.status(404);
          }

          // esResponse has been filtered by postDelete
          res.json(esResponse);
        });
      });
    });
  }.bind(this);

  // for security, all endpoints require manual opt-in
  if (options.search === true) {
    // We don't write to prototype because not every instance of Controller has these methods. The codex middleware uses
    // the presence or absence of these methods to decide what routes to setup.
    this.search = defaultSearch;
  }

  if (options.get === true) {
    this.get = defaultGet;
  } else {
    this.get = options.get;
  }

  // really more of a create, but since it's also used by replace, we call it insert
  if (options.insert === true) {
    this.insert = defaultInsert;
  } else {
    this.insert = options.insert;
  }

  if (options.replace === true) {
    // replace is just insert with an ID
    this.replace = defaultInsert;
  } else {
    this.replace = options.replace;
  }

  if (options.replaceAll === true) {
    throw new Error('No default for replaceAll');
  } else {
    this.replaceAll = options.replaceAll;
  }

  if (options.delete === true) {
    this.delete = defaultDelete;
  } else {
    this.delete = options.delete;
  }

  if (options.deleteAll === true) {
    throw new Error('No default for deleteAll');
  } else {
    this.deleteAll = options.deleteAll;
  }

  var initHandler = function (name, defaultFunc) {
    if (Array.isArray(options[name])) {
      // callers can pass an array to override default handlers
      this[name] = options[name];
    } else {
      this[name] = [defaultFunc];
      if (options[name]) {
        this[name].push(options[name]);
      }
    }
  }.bind(this);

  if (this.search) {
    initHandler('preSearch', function (req, esRequest, callback) {
      if (!callback) {
        callback = arguments[1];
        esRequest = null;
      }

      if (esRequest) {
        // esRequest already initialized
        return callback(null, esRequest);
      }

      esRequest = {
        body: {}
      };

      // NOTE: params can be in query string or request body

      // Support pagination
      var from = req.query.from || req.body.from;
      if (from || from === 0) {
        esRequest.from = parseInt(from, 10);
      }

      var size = req.query.size || req.body.size;
      if (size || size === 0) {
        esRequest.size = parseInt(size, 10);
      }

      // Support sorting
      var sort = req.query.sort || req.body.sort;
      if (sort) { // sort is always a string
        // TODO test this for potential injection attacks
        esRequest.sort = sort;
      }

      var q = req.query.q || req.body.q;
      if (q) {
        // We don't check for the empty string here since most of the time you don't want to search for the empty
        // string, especially since elasticsearch's inverted index doesn't store nulls or the empty string
        // (you're supposed to use a missing filter instead)

        esRequest.body.query = { // have to use body instead of q because we might have aggregations
          'query_string': {
            query: q
          }
        };
      } else {
        esRequest.body.query = {
          'match_all': {}
        };
      }

      var body = req.body || {};

      // aggregations have to be in body, plus that's the only way for them to be parsed as JSON
      var aggs = body.aggregations || body.aggs;
      if (aggs) {
        // don't add an undefined property
        esRequest.body.aggregations = aggs; // TODO whitelist acceptable aggregations

        if (!size) {
          // With aggregations, you usually don't want search results. The only reason this isn't the default in
          // elasticsearch is probably because of backwards compatibility.
          esRequest.size = 0;
        }
      }

      callback(null, esRequest);
    });

    initHandler('postSearch', function (req, esResponse, response, callback) {
      response = {
        results: esResponse.hits.hits.map(function (hit) {
          return {
            // don't include _index or _type, it leaks information and isn't useful to client
            _id: hit._id,
            _version: hit._version,
            _score: hit._score,
            _source: hit._source
          };
        }),
        total: esResponse.hits.total
      };

      var body = req.body || {};
      if (body.aggregations || body.aggs) {
        response.aggregations = esResponse.aggregations;
      }

      callback(null, response);
    });
  }

  if (this.get) {
    initHandler('preGet', function (req, esRequest, callback) {
      if (!callback) {
        callback = arguments[1];
        esRequest = null;
      }

      if (esRequest) {
        // esRequest already initialized
        return callback(null, esRequest);
      }

      callback(null, {id: req.params.id});
    });

    initHandler('postGet', function (req, esResponse, response, callback) {
      // TODO warn if password is present in _source
      callback(null, {
        // don't include _index or _type
        _id: esResponse._id,
        _version: esResponse._version,
        _source: esResponse._source
        // elasticsearch also returns a boolean "found" field, but that's what HTTP status codes are for
      });
    });
  }

  if (this.insert || this.replace) { // these callbacks are used for both insert and replace
    initHandler('preInsert', function (req, esRequest, callback) {
      if (!callback) {
        callback = arguments[1];
        esRequest = null;
      }

      if (esRequest) {
        // esRequest already initialized
        return callback(null, esRequest);
      }

      esRequest = {
        body: req.body
      };

      var id = req.params.id;
      var version = req.query.version;

      // don't set undefined properties
      if (id || id === 0) { // it should always be a string, but just in case
        esRequest.id = id;
      }
      if (version) {
        esRequest.version = version;
      }

      callback(null, esRequest);
    });

    initHandler('postInsert', function (req, esResponse, callback) {
      callback(null, {
        _id: esResponse._id, // this is important so that the client knows what record they created
        _version: esResponse._version
      });
    });
  }

  if (this.delete) {
    initHandler('preDelete', function (req, esRequest, callback) {
      if (!callback) {
        callback = arguments[1];
        esRequest = null;
      }

      if (esRequest) {
        // esRequest already initialized
        return callback(null, esRequest);
      }

      callback(null, {id: req.params.id});
    });

    initHandler('postDelete', function (req, esResponse, callback) {
      callback(null, {
        _id: esResponse._id,
        _version: esResponse._version
      });
    });
  }

  // clients can use preInsert and postInsert and just check if an ID was specified
  //  if (this.replace) {
  //    this.preReplace = options.preReplace;
  //    this.postReplace = options.postReplace;
  //  }

  // this isn't used yet because it's dangerous
  //  if (this.replaceAll) {
  //    this.preReplaceAll = options.preReplaceAll;
  //    if (!Array.isArray(this.preReplaceAll)) {
  //      this.preReplaceAll = [this.preReplaceAll];
  //    }
  //
  //    this.postReplaceAll = options.postReplaceAll;
  //    if (!Array.isArray(this.postReplaceAll)) {
  //      this.postReplaceAll = [this.postReplaceAll];
  //    }
  //  }

  // this isn't used yet because it's dangerous
  //  if (this.deleteAll) {
  //    this.preDeleteAll = options.preDeleteAll;
  //    if (!Array.isArray(this.preDeleteAll)) {
  //      this.preDeleteAll = [this.preDeleteAll];
  //    }
  //
  //    this.postDeleteAll = options.postDeleteAll;
  //    if (!Array.isArray(this.postDeleteAll)) {
  //      this.postDeleteAll = [this.postDeleteAll];
  //    }
  //  }
}

Controller.prototype['with'] = function (plugin) {
  // this is an initialization function, so it's OK to be synchronous
  return plugin(this) || this;
};

module.exports = Controller;
