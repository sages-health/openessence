'use strict';

var util = require('util');
var Model = require('../model');

function Symptom () {
  Model.call(this, {
    index: 'symptom',
    type: 'symptom'
  });
}

Symptom.prototype.checkConstraints = function (params, callback) {
  var name = params.body.name;

  this.client.search({
    body: {
      query: {
        'constant_score': {
          filter: {
            term: {
              // use un-analyzed version of the field for case-sensitive matching
              'name.raw': name
            }
          }
        }
      }
    }
  }, function (err, response) {
    if (err) {
      callback(err);
      return;
    }

    var results = response.hits.hits;

    if (results.length > 1) {
      callback(new Error('Existing records violate unique constraint'));
      return;
    }

    if (results.length === 1 && params.id !== results[0]._id) {
      callback(null, {
        message: 'Unique constraint violation for name:"' + name + '"'
      });
    } else {
      callback(null);
    }
  });
};

util.inherits(Symptom, Model);

module.exports = Symptom;
