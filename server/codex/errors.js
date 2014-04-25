'use strict';

var util = require('util');

function ConstraintError (message) {
  Error.call(this, message);
  this.message = message;
  this.name = this.constructor.name;
  this.status = 400;
  Error.captureStackTrace(this, ConstraintError);
}
util.inherits(ConstraintError, Error);

module.exports = {
  ConstraintError: ConstraintError
};
