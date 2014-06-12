'use strict';

var util = require('util');
var Model = require('../model');

function Geometry () {
  Model.call(this, {
    index: 'geometry',
    type: 'cityville_districts'
  });
}
util.inherits(Geometry, Model);

module.exports = Geometry;
