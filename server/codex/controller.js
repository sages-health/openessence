'use strict';

var _ = require('lodash');
var express = require('express');
var errors = require('./errors');
var logger = require('../conf').logger;

function Controller () {
  if (!(this instanceof Controller)) {
    return new Controller();
  }
}

Controller.prototype.queryAll = function (req, callback) {
  // The model must have been deserialized from the request
  if (!req.model) {
    callback(new errors.SerializationError('No model present on request'));
    return;
  }

  var request = {
    body: {}
  };

  // Support pagination
  var from = req.param('from');
  if (from || from === 0) {
    request.from = parseInt(from, 10);
  }
  var size = req.param('size');
  if (size || size === 0) {
    request.size = parseInt(size, 10);
  }

  // Support sorting
  if (req.param('sort')) { // sort is always a string
    // TODO test this for potential injection attacks
    request.sort = req.param('sort');
  }

  if (req.param('q')) { // req.param because parameter can be in query string or body
    // have to use body instead of q because we might have aggregations
    request.body.query = {
      'query_string': {
        query: req.param('q')
      }
    };
  } else {
    request.body.query = {
      'match_all': {}
    };
  }

  // aggregations have to be in body, plus that's the only way for them to be parsed as JSON
  var aggregations = req.body.aggregations || req.body.aggs;

  // Support aggregations TODO whitelist acceptable aggregations
  if (aggregations) {
    request.body.aggregations = aggregations;
  }

  // Search the model on the request
  req.model.search(request, function (err, esr) {
    // Pass errors to the remainder of the filter chain
    if (err) {
      callback(err);
      return;
    }

    var response = {
      results: esr.hits.hits,
      total: esr.hits.total
    };

    if (aggregations) {
      response.aggregations = esr.aggregations;
    }

    // Otherwise, terminate the chain with the query results
    callback(null, response);
  });
};

Controller.prototype.updateAll = function (req, callback) {
  // The model must have been deserialized from the request
  if (!req.model) {
    callback(new errors.SerializationError('No model present on request'));
    return;
  }

  // The body must be an array of objects (we're replacing the whole collection)
  if (!req.body || !Array.isArray(req.body)) {
    callback(new errors.FormatError('Invalid update format'));
    return;
  }

  // The actual insert is broken out here so that it can be called with or without
  // truncating the index first
  var populate = function (err) {
    if (err) {
      callback(err);
      return;
    }

    // Build a bulk API request
    var request = {
      body: []
    };
    var outerProps = ['_id', '_version', '_index', '_type'];
    req.body.forEach(function (item) {
      var cmd = {
        index: _.pick(item, outerProps)
      };

      request.body.push(cmd);
      request.body.push(item._source || _.omit(item, outerProps));
    });

    req.model.bulk(request, function (err, esr) {
      if (err) {
        callback(err);
        return;
      }

      // Make sure to respond with a creation status
      // Only returns the key fields. Does not include the source (not available); would require an additional query
      var results = [];
      esr.items.forEach(function (item) {
        results.push(_.pick(item.index, outerProps));
      });
      callback(null, {
        results: results,
        status: 201
      });
    });
  };

  // Make sure the index exists before truncating it
  req.model.indices.exists({} /* Use defaults */, function (err, exists) {
    if (err) {
      callback(err);
      return;
    }

    // If it does, then delete it
    if (exists) {
      req.model.indices.delete({} /* Use defaults */, populate);
      // Otherwise, just do the bulk insert
    } else {
      populate(null);
    }
  });

};

Controller.prototype.deleteAll = function (req, callback) {
  // The model must have been deserialized from the request
  if (!req.model) {
    callback(new errors.SerializationError('No model present on request'));
    return;
  }

  // Truncate the index
  req.model.indices.delete({} /* Use defaults */, function (err, esr) {
    if (err) {
      callback(err);
      return;
    }

    // Properly acknowledge the deletion by status code only
    callback(null, {
      status: esr.acknowledged ? 204 : 202
    });
  });
};

Controller.prototype.query = function (req, callback) {
  // The model must have been deserialized from the request
  if (!req.model) {
    callback(new errors.SerializationError('No model present on request'));
    return;
  }

  // The instance ID must have been deserialized from the request
  if (!req.instance) {
    callback(new errors.SerializationError('No instance present on request'));
    return;
  }

  // Build a get request, relying on the defaults
  var request = {
    id: req.instance
  };
  req.model.get(request, function (err, esr) {
    if (err) {
      callback(err);
      return;
    }

    // Specifically sub-sample the response to include only the needed fields
    callback(null, {
      results: [
        _.pick(esr, ['_id', '_version', '_index', '_type', '_source'])
      ]
    });
  });
};

Controller.prototype.update = function (req, callback) {
  // The model must have been deserialized from the request
  if (!req.model) {
    callback(new errors.SerializationError('No model present on request'));
    return;
  }

  // The body must be a single object to insert or update
  if (!(req.body && _.isObject(req.body) && !Array.isArray(req.body))) {
    callback(new errors.FormatError('Invalid record format'));
    return;
  }

  // Generate an insert request from the body object
  // Be smart about moving properties outside of the passed object to their correct position in the request
  var outerProps = ['_id', '_version', '_index', '_type'];
  var request = _.transform(_.pick(req.body, outerProps), function (result, value, key) {
    if (key.charAt(0) === '_') {
      key = key.substring(1);
    }
    result[key] = value;
  });
  request.body = req.body._source || _.omit(req.body, outerProps);

  // This method can also be used to perform updates, iff the ID is provided
  if (req.instance) {
    request.id = req.instance;
  }

  // Insert or update the document
  req.model.insert(request, function (err, esr) {
    if (err) {
      callback(err);
      return;
    }

    // Make sure to respond with a creation or update status
    // Only returns the key fields. Does not include the source (not available); would require an additional query
    callback(null, {
      results: [
        _.pick(esr, outerProps)
      ],
      status: (esr._version > 1) ? 200 : 201
    });
  });
};

Controller.prototype.delete = function (req, callback) {
  // The model must have been deserialized from the request
  if (!req.model) {
    callback(new errors.SerializationError('No model present on request'));
    return;
  }

  // The instance ID must have been deserialized from the request
  if (!req.instance) {
    callback(new errors.SerializationError('No instance present on request'));
    return;
  }

  // Build a deletion request, relying on the defaults
  var request = {
    id: req.instance
  };
  req.model.delete(request, function (err, esr) {
    if (err) {
      callback(err);
      return;
    }

    // Return just the key fields
    // Unlike collection deletion, extra properties are returned, making this 200 instead of 202/204
    callback(null, {
      results: [
        _.pick(esr, ['_id', '_version', '_index', '_type'])
      ]
    });
  });
};

/**
 * Formats the response from elasticsearch and sends it to the client. Subclasses can override this method to send
 * custom responses to the client, e.g. including extra data.
 */
Controller.prototype.respond = function (err, esResponse, res, next) {
  if (err) {
    next(err);
    return;
  }
  var status = esResponse.status || 200;

  // this duplicates the whitelisting we do in the dao methods b/c we're being extra cautious about not
  // returning sensitive fields
  var data = {
    results: esResponse.results
  };
  if (esResponse.total) {
    data.total = esResponse.total;
  }
  if (esResponse.aggregations) {
    data.aggregations = esResponse.aggregations;
  }

  if (esResponse.results) {
    res.json(status, data);
  } else {
    res.status(status);
    res.end();
  }
};

/**
 *
 * @returns {*} express middleware
 */
Controller.prototype.middleware = function () {
  var app = express();
  var controller = this;

  // Make sure we include the middleware we need so we can test this controller in isolation.
  // It's not a big deal that body-parser is also included in ../index.js, since it checks to see if it's already been
  // included: `if (req._body) return next();`
  app.use(require('body-parser')());

  app.param('model', function (req, res, next, model) {
    try {
      var Model = require('./models/' + model.toLowerCase());
      req.model = new Model();
      next();
    } catch (e) {
      // yes, we're actually using exceptions in Node
      if (e.code === 'MODULE_NOT_FOUND') {
        // MODULE_NOT_FOUND is thrown if the model doesn't exist, or if the model tried to require() something that
        // doesn't exist
        logger.error('Error loading model %s', model);
        next(e);
      } else {
        throw e;
      }
    }
  });

  app.param('id', function (req, res, next, id) {
    if (/^[\w-]+$/.test(id)) {
      req.instance = id;
      next();
    } else {
      // skip this route
      next('route');
    }
  });

  app.get('/:model', function (req, res, next) {
    controller.queryAll(req, function (err, esResponse) {
      controller.respond(err, esResponse, res, next);
    });
  });

  app.get('/:model/:id', function (req, res, next) {
    controller.query(req, function (err, esResponse) {
      controller.respond(err, esResponse, res, next);
    });
  });

  app.post('/:model', function (req, res, next) {
    controller.update(req, function (err, esResponse) {
      controller.respond(err, esResponse, res, next);
    });
  });

  // POST /:model/:id doesn't make sense

  app.post('/:model/search', function (req, res, next) {
    controller.queryAll(req, function (err, esResponse) {
      controller.respond(err, esResponse, res, next);
    });
  });

  app.put('/:model', function (req, res, next) {
    controller.updateAll(req, function (err, esResponse) {
      controller.respond(err, esResponse, res, next);
    });
  });

  app.put('/:model/:id', function (req, res, next) {
    controller.update(req, function (err, esResponse) {
      controller.respond(err, esResponse, res, next);
    });
  });

  app.delete('/:model', function (req, res, next) {
    controller.deleteAll(req, function (err, esResponse) {
      controller.respond(err, esResponse, res, next);
    });
  });

  app.delete('/:model/:id', function (req, res, next) {
    controller.delete(req, function (err, esResponse) {
      controller.respond(err, esResponse, res, next);
    });
  });

  app.use(function (err, req, res, next) {
    // If the error has a status, use that (codex custom errors do this).
    // Otherwise, try to assign an appropriate HTTP status code based on error
    // TODO: Expand this to accommodate other ES errors
    if (!err.status && err.constructor.name === 'StatusCodeError') {
      if (/^Not Found/.test(err.message) || /^IndexMissingException/.test(err.message)) {
        err.status = 404;
      } else if (/^Bad Request/.test(err.message)) {
        err.status = 400;
      }
    }

    // This handler only corrects status codes from ElasticSearch / these methods
    // TODO: File a pull request with ES to get their StatusCodeError fixed
    next(err);
  });

  return app;
};

module.exports = Controller;