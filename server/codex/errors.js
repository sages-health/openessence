'use strict';

var util = require('util');

/**
 * Error involving a constraint violation, e.g. a unique constraint
 * @param name the name of the specific contstaint violated, e.g. "UniqueConstraint"
 * @param message passed to Error
 * @constructor
 */
function ConstraintError (name, message) {
  Error.call(this, message);
  this.message = message;
  this.name = name;
  this.status = 400;
  Error.captureStackTrace(this, ConstraintError);
}
util.inherits(ConstraintError, Error);

function FormatError (message) {
  Error.call(this, message);
  this.message = message;
  this.name = this.constructor.name;
  this.status = 400;
  Error.captureStackTrace(this, FormatError);
}
util.inherits(FormatError, Error);

function SerializationError (message) {
  Error.call(this, message);
  this.message = message;
  this.name = this.constructor.name;
  this.status = 500;
  Error.captureStackTrace(this, SerializationError);
}
util.inherits(SerializationError, Error);

module.exports = {
  ConstraintError: ConstraintError,
  FormatError: FormatError,
  SerializationError: SerializationError
};
