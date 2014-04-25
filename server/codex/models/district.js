'use strict';

var util = require('util');
var Model = require('../model');

function District () {
  Model.call(this, {
    index: 'region',
    type: 'district'
  });
}

util.inherits(District, Model);

District.prototype.checkConstraints = function (params, callback) { // TODO refactor into enforceUniqueConstraint
  var name = params.body.name;

  this.client.search({
    body: {
      query: {
        'constant_score': {
          filter: {
            term: {
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

module.exports = District;
