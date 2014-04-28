'use strict';

var util = require('util');
var Model = require('../model');

function Diagnosis () {
  Model.call(this, {
    index: 'diagnosis',
    type: 'diagnosis'
  });
}

util.inherits(Diagnosis, Model);

Diagnosis.prototype.checkConstraints = function (params, callback) {
  var name = params.body.name;

  this.client.search({
    index: this.index,
    type: this.type,
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
        name: 'UniqueConstraintViolationError',
        message: 'Unique constraint violation for name:"' + name + '"'
      });
    } else {
      callback(null);
    }
  });
};

module.exports = Diagnosis;
