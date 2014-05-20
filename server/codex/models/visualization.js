'use strict';

var util = require('util');
var Model = require('../model');

function Visualization () {
  Model.call(this, {
    index: 'visualization',
    type: 'visualization'
  });
}
util.inherits(Visualization, Model);

module.exports = Visualization;
