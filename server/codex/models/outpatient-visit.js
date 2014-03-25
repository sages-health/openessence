'use strict';

var util = require('util');
var Model = require('../model');

function OutpatientVisit () {
  Model.call(this);
}

OutpatientVisit.INDEX = 'er'; // TODO rename
OutpatientVisit.TYPE = 'visit';

OutpatientVisit.MAPPING = {
 // TODO
};

util.inherits(OutpatientVisit, Model);

module.exports = OutpatientVisit;
