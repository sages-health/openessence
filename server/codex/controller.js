'use strict';

var _ = require('lodash');
var errors = require('./errors');

function Controller () {
  if (!(this instanceof Controller)) {
    return new Controller();
  }
}

Controller.prototype.queryAll = function (req, res, next) {
  var esRequest = {
    body: {}
  };

  // Support pagination
  var from = req.param('from');
  if (from || from === 0) {
    esRequest.from = parseInt(from, 10);
  }
  var size = req.param('size');
  if (size || size === 0) {
    esRequest.size = parseInt(size, 10);
  }

  // Support sorting
  if (req.param('sort')) { // sort is always a string
    // TODO test this for potential injection attacks
    esRequest.sort = req.param('sort');
  }

  if (req.param('q')) { // req.param because parameter can be in query string or body
    // have to use body instead of q because we might have aggregations
    esRequest.body.query = {
      'query_string': {
        query: req.param('q')
      }
    };
  } else {
    esRequest.body.query = {
      'match_all': {}
    };
  }

  // aggregations have to be in body, plus that's the only way for them to be parsed as JSON
  var aggregations = req.body.aggregations || req.body.aggs;

  // Support aggregations TODO whitelist acceptable aggregations
  if (aggregations) {
    esRequest.body.aggregations = aggregations;
  }

  // Search the model on the request
  req.model.search(esRequest, function (err, esr) {
    // Pass errors to the remainder of the filter chain
    if (err) {
      next(err);
      return;
    }

    var response = {
      results: esr.hits.hits,
      total: esr.hits.total
    };

    if (aggregations) {
      response.aggregations = esr.aggregations;
    }

    res.json(response);
  });
};

Controller.prototype.updateAll = function (req, res, next) {
  // The body must be an array of objects (we're replacing the whole collection)
  if (!req.body || !Array.isArray(req.body)) {
    next(new errors.FormatError('Invalid update format'));
    return;
  }

  // The actual insert is broken out here so that it can be called with or without
  // truncating the index first
  var populate = function (err) {
    if (err) {
      next(err);
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
        next(err);
        return;
      }

      // Make sure to respond with a creation status
      // Only returns the key fields. Does not include the source (not available); would require an additional query
      var results = [];
      esr.items.forEach(function (item) {
        results.push(_.pick(item.index, outerProps));
      });
      req.controller.respond({
        results: results,
        status: 201
      }, res);
    });
  };

  // Make sure the index exists before truncating it
  req.model.indices.exists({} /* Use defaults */, function (err, exists) {
    if (err) {
      next(err);
      return;
    }

    // If it does, then delete it
    if (exists) {
      // TODO this drops mapping too
      req.model.indices.delete({} /* Use defaults */, populate);
      // Otherwise, just do the bulk insert
    } else {
      populate(null);
    }
  });
};

Controller.prototype.deleteAll = function (req, res, next) {
  // Truncate the index
  req.model.indices.delete({} /* Use defaults */, function (err, esr) {
    if (err) {
      next(err);
      return;
    }

    // Properly acknowledge the deletion by status code only
    req.controller.respond({
      status: esr.acknowledged ? 204 : 202
    }, res);
  });
};

Controller.prototype.query = function (req, res, next) {
  // Build a get request, relying on the defaults
  var request = {
    id: req.instance
  };
  req.model.get(request, function (err, esr) {
    if (err) {
      next(err);
      return;
    }

    // send response ourselves, don't call controller.respond()
    var record = {
      _index: esr._index,
      _type: esr._type,
      _id: esr._id
    };

    if (esr.found) {
      res.status(200);
      record._version = esr._version;
      record._source = esr._source;
    } else {
      // TODO elasticsearch.js returns error on 404, so this will never get called
      res.status(404);
    }

    res.json(record);
  });
};

Controller.prototype.update = function (req, res, next) {
  // The body must be a single object to insert or update
  if (!(req.body && _.isObject(req.body) && !Array.isArray(req.body))) {
    next(new errors.FormatError('Invalid record format'));
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
      next(err);
      return;
    }

    // Make sure to respond with a creation or update status
    // Only returns the key fields. Does not include the source (not available); would require an additional query
    req.controller.respond({
      results: [
        _.pick(esr, outerProps)
      ],
      status: (esr._version > 1) ? 200 : 201
    }, res);
  });
};

Controller.prototype.delete = function (req, res, next) {
  // Build a deletion request, relying on the defaults
  var request = {
    id: req.instance
  };
  req.model.delete(request, function (err, esr) {
    if (err) {
      next(err);
      return;
    }

    if (esr.found) {
      res.status(404);
    } else {
      res.status(200);
    }

    res.json({
      _index: esr._index,
      _type: esr._type,
      _id: esr._id,
      _version: esr._version
    });
  });
};

/**
 * Formats the response from elasticsearch and sends it to the client. Subclasses can override this method to send
 * custom responses to the client, e.g. including extra data.
 */
Controller.prototype.respond = function (esResponse, res) { // TODO get rid of this method
  var status = esResponse.status || 200;

  // this duplicates the whitelisting we do in the dao methods b/c we're being extra cautious about not
  // returning sensitive fields, and b/c the dao adds some fields like status
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

module.exports = Controller;
