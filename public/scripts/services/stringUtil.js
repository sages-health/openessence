'use strict';

// @ngInject
module.exports = function () {
  return {
    compare: function (a1, b1) {
      var a = a1.name || a1 || '';
      var b = b1.name || b1 || '';

      if (a > b) {
        return 1;
      }
      if (a < b) {
        return -1;
      }
      // a must be equal to b
      return 0;
    }

  };
};
