'use strict';

var chai = require('chai');
chai.use(require('sinon-chai'));
var expect = chai.expect;

var error = require('../../server/error');

describe('error-middleware', function () {
  describe('notFound', function () {
    it('should return 404', function () {
      var code;
      var req = {};
      var res = {
        render: function () {},
        send: function () {},
        format: function () {},
        status: function (s) {
          code = s;
        }
      };
      error.notFound(req, res);
      expect(code).to.equal(404);
    });
  });
});
