'use strict';

var util = require('util');
var Model = require('../model');

function OutpatientVisit () {
  Model.call(this, {
    index: 'outpatient',
    type: 'visit'
  });
}

util.inherits(OutpatientVisit, Model);

module.exports = OutpatientVisit;
