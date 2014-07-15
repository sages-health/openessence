'use strict';

// this file is automatically executed by mocha before any tests, see http://stackoverflow.com/a/20780657

var nock = require('nock');
var conf = require('../../server/conf');

afterEach(function () {
  nock.cleanAll();
});

after(function () {
  conf.redis.client.unref(); // otherwise gulp doesn't always terminate
});
