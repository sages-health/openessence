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
    },

    getLocaleValue: function (field) {
      var value = field.split('.').reduce(function (obj, i) { //traverse down parent.child.prop key
          return obj + i.charAt(0).toUpperCase() + i.slice(1);
      });
      return '' + value.charAt(0).toUpperCase() + value.slice(1) + '';
    }

  };
};
