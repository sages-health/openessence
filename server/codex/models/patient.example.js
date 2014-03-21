'use strict';

var util = require('util');
var Model = require('../model');

function Patient () {
  Model.call(this);
}

Patient.mapping = {

};

util.inherits(Patient, Model);

module.exports = Patient;
