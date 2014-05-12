'use strict';

var _ = require('lodash');
var errors = require('./errors');

function Controller () {
  if (!(this instanceof Controller)) {
    return new Controller();
  }
}

Controller.prototype.prepareSearch = function (req, callback) {
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

  callback(null, esRequest);
};

Controller.prototype.search = function (req, res, next) {
  this.prepareSearch(req, function (err, esRequest) {
    req.model.search(esRequest, function (err, esr) {
      if (err) {
        next(err);
        return;
      }

      var response = {
        results: esr.hits.hits,
        total: esr.hits.total
      };

      if (req.body.aggregations || req.body.aggs) {
        response.aggregations = esr.aggregations;
      }

      res.json(response);
    });
  });
};

// this is different than prepare{Insert, Delete, Search} because we don't need to do a separate request for access
// control, we only need the response from the request to check access restrictions
Controller.prototype.allowGet = function (esResponse, req, callback) {
  callback(null, true);
};

Controller.prototype.get = function (req, res, next) {
  // Build a get request, relying on the defaults
  var request = {
    id: req.instance
  };
  req.model.get(request, function (err, esr) {
    if (err) {
      // elasticsearch.js also treats 404 as an error, which is good enough for now
      next(err);
      return;
    }

    this.allowGet(esr, req, function (err, allow) {
      if (err) {
        next(err);
        return;
      }

      var record = {
        _index: esr._index,
        _type: esr._type,
        _id: esr._id
      };

      if (!allow) {
        res.status(404)// don't send 403, that would disclose that this record exists
          .send(record); // still send request information, just like elasticsearch does
        return;
      }

      record._version = esr._version;
      record._source = esr._source;
      res.send(record);
    });
  }.bind(this));
};

/**
 * Given a client request, generates an elasticsearch index request to insert data. Subclasses can override this method
 * to insert custom data into elasticsearch or to implement access control.
 * @param req client's HTTP request
 * @param callback called with error and the elasticsearch request
 */
Controller.prototype.prepareInsert = function (req, callback) {
  // Generate an insert request from the body object
  // Be smart about moving properties outside of the passed object to their correct position in the request
  var outerProps = ['_id', '_version', '_index', '_type'];
  var tentativeEsRequest = _.transform(_.pick(req.body, outerProps), function (result, value, key) {
    if (key.charAt(0) === '_') {
      key = key.substring(1);
    }
    result[key] = value;
  });
  tentativeEsRequest.body = req.body._source || _.omit(req.body, outerProps);

  // This method can also be used to perform updates, iff the ID is provided
  if (req.instance) {
    tentativeEsRequest.id = req.instance;
  }

  callback(null, tentativeEsRequest);
};

/**
 * Used for inserting and updating (since an update in elasticsearch really is just an insert over old data).
 * @param req express request
 * @param res express response
 * @param next express next
 */
Controller.prototype.insert = function (req, res, next) {
  // The body must be a single object to insert or update
  if (!(req.body && _.isObject(req.body) && !Array.isArray(req.body))) {
    next(new errors.FormatError('Invalid record format'));
    return;
  }

  this.prepareInsert(req, function (err, esRequest) {
    if (err) {
      next(err);
      return;
    }

    // Insert or update the document
    req.model.insert(esRequest, function (err, esr) {
      if (err) {
        next(err);
        return;
      }

      if (esr.created) {
        res.status(201);
      } else {
        res.status(200);
      }

      res.send({
        _index: esr._index,
        _type: esr._type,
        _id: esr._id, // this is important so that the client knows what record they created
        _version: esr._version
      });
    });
  });
};

Controller.prototype.prepareDelete = function (req, callback) {
  callback(null, {
    id: req.instance
  });
};

Controller.prototype.delete = function (req, res, next) {
  if (!req.instance) {
    next(new Error('req.instance not specified'));
    return;
  }

  this.prepareDelete(req, function (err, esRequest) {
    if (err) {
      next(err);
      return;
    }

    req.model.delete(esRequest, function (err, esr) {
      if (err) {
        next(err);
        return;
      }

      if (!esr.found) {
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
  });
};

module.exports = Controller;
