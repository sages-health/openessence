'use strict';

var _ = require('lodash');
var logger = require('../conf').logger;

// Inspired by ActiveRecord's PaperTrail: https://github.com/airblade/paper_trail
// Currently only records when updates happen
// TODO import more features from PaperTrail, like recording old versions of documents

function makePaperTrail (model, req, callback) {
  if (!callback) {
    callback = arguments[1];
    req = null;
  }

  var createEntry = function () {
    return {
      createdAt: new Date()
    };
  };

  var getModel = req ? req.codex.get : model.get;

  if (model.id || model.id === 0) { // ID should be a string, but you can never be too careful
    // get list of modifications
    getModel({id: model.id}, function (err, instance) {
      if (err) {
        return callback(err);
      }

      var trail = instance.doc.paperTrail || [];
      trail.push(createEntry());

      return callback(null, trail);
    });
  } else {
    return callback(null, [createEntry()]);
  }
}

function caperTrailModel (Model) {
  Model.preInsert.push(function paperTrail (model, callback) {
    if (model.doc.paperTrail) {
      // models allow consumers to override paper trails, controllers don't
      return callback(null, model);
    }

    makePaperTrail(model, function (err, trail) {
      if (err) {
        return callback(err);
      }

      model.doc.paperTrail = trail;

      // This allows consumers to override paperTrail if they need to. The controller blocks untrusted clients from
      // being able to do this maliciously
      callback(null, model);
    });
  });

  return Model;
}

function caperTrailController (controller) {
  // Don't send paperTrail down to client. It has potentially sensitive information (usernames, access times)
  // that the client doesn't really need. The paper trail is more useful for forensics with access to elasticsearch
  // anyway.
  if (controller.postSearch) {
    controller.postSearch.push(function (req, esResponse, response, callback) {
      if (!response || !response.results) {
        return callback(null, response);
      }

      response.results = response.results.map(function (result) {
        if (result._source) {
          delete result._source.paperTrail;
        }

        return result;
      });

      callback(null, response);
    });
  }

  if (controller.postGet) {
    controller.postGet.push(function (req, esResponse, response, callback) {
      if (response && response._source) {
        delete response._source.paperTrail;
      }

      callback(null, response);
    });
  }

  if (controller.preInsert) {
    controller.preInsert.push(function paperTrail (req, esRequest, callback) {
      /*jshint quotmark:false */
      if (esRequest.body.paperTrail) {
        logger.warn({req: req}, "Client tried to overwrite paper trail. Don't worry, we got 'em");
      }

      makePaperTrail(new controller.Model(esRequest.body, esRequest), req, function (err, trail) {
        if (err) {
          return callback(err);
        }

        // this is why it's important not to keep around extra properties (like passwords) on req.user
        trail[trail.length - 1].user = req.user.doc;
        // TODO don't send users down to client, the utility is limited but the security implications are real

        // the order of these assigns is crucial - this way we overwrite any paperTrails the client tried to send
        var body = _.assign({}, esRequest.body, {paperTrail: trail});
        callback(null, _.assign({}, esRequest, {body: body}));
      });
    });
  }
}

function caperTrailMapping (mapping) {
  mapping.properties = mapping.properties || {};

  mapping.properties.paperTrail = mapping.properties.paperTrail || { // array of audit events
    properties: {
      // When this version of the document was created.
      // The naming comes from PaperTrail: https://github.com/airblade/paper_trail
      createdAt: {
        type: 'date'
      },

      // User that created this version of the document
      user: {
        type: 'object'
      }
    }
  };

  return mapping;
}

module.exports = {
  model: caperTrailModel,
  controller: caperTrailController,
  mapping: caperTrailMapping
};
