'use strict';

/**
 * This is a polyfill for the bind function, which is a recent addition to
 * the ECMA-262, 5th addition.
 * bind() is not supported in the phantom headless browser yet so this polyfill
 * is needed to render nvd3 graphics
 */
if (!Function.prototype.bind) {
  Function.prototype.bind = function (oThis) {
    if (typeof this !== 'function') {
      // closest thing possible to the ECMAScript 5
      // internal IsCallable function
      throw new TypeError('Function.prototype.bind - what is trying to be bound is not callable');
    }

    var aArgs = Array.prototype.slice.call(arguments, 1),
      fToBind = this,
      fNOP = function () {
      },
      fBound = function () {
        return fToBind.apply(((this instanceof fNOP && oThis) ? this : oThis),
          aArgs.concat(Array.prototype.slice.call(arguments)));
      };

    fNOP.prototype = this.prototype;
    /*jshint newcap: false */
    fBound.prototype = new fNOP();

    return fBound;
  };
}
