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

  var getModel = req ? req.codex.get : model._.get;

  if (model._.id) {
    // get list of modifications
    getModel({id: model._.id}, function (err, instance) {
      if (err) {
        return callback(err);
      }

      var trail = instance.paperTrail || [];
      trail.push(createEntry());

      return callback(null, trail);
    });
  } else {
    return callback(null, [createEntry()]);
  }
}

function caperTrailModel (Model) {
  Model.preInsert.push(function paperTrail (model, callback) {
    if (model.paperTrail) {
      // models allow consumers to override paper trails, controllers don't
      return callback(null, model);
    }

    makePaperTrail(model, function (err, trail) {
      if (err) {
        return callback(err);
      }

      // This allows consumers to override paperTrail if they need to. The controller blocks untrusted clients from
      // being able to do this maliciously
      callback(null, _.assign({paperTrail: trail}, model));
    });
  });

  return Model;
}

function caperTrailController (controller) {
  if (!controller.preInsert) {
    logger.warn('Cannot use CaperTrail on a controller that doesn\'t support insert');
    return;
  }

  controller.preInsert.push(function paperTrail (req, esRequest, callback) {
    if (esRequest.body.paperTrail) {
      logger.warn({req: req}, 'Client tried to overwrite paper trail. Don\'t worry, we got \'em');
    }

    makePaperTrail(new controller.Model(esRequest.body, esRequest), req, function (err, trail) {
      if (err) {
        return callback(err);
      }

      // this is why it's important not to keep around extra properties (like passwords) on req.user
      trail[trail.length - 1].user = req.user;

      // the order of these assigns is crucial - this way we overwrite any paperTrails the client tried to send
      var body = _.assign({}, esRequest.body, {paperTrail: trail});
      callback(null, _.assign({}, esRequest, {body: body}));
    });
  });
}

module.exports = {
  model: caperTrailModel,
  controller: caperTrailController
};