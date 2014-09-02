'use strict';

var humane = require('humane-js');

// @ngInject
module.exports = function () {
  var error = humane.create({
    addnCls: 'humane-error'
  });
  var info = humane.create({
    addnCls: 'humane-info'
  });

  return {
    error: function (message) {
      error.log(message);
    },
    info: function (message) {
      info.log(message);
    }
  };
};
