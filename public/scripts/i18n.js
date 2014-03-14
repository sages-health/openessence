'use strict';

// we're not using angular here because we're outside angular-module-land
var $ = require('jquery');

// get strings as soon as we're loaded and save them in a promise
var deferred = new $.Deferred();

// document.documentElement.lang is set in index.html by the server
$.getJSON('/public/translations/' + document.documentElement.lang + '.json')
  .done(function (data) {
    return deferred.resolve(data);
  })
  .fail(function (jqxhr, status, error) {
    return deferred.reject(error);
  });

exports.strings = function () {
  return deferred.promise();
};
