'use strict';

var chai = require('chai');
chai.use(require('sinon-chai'));
var expect = chai.expect;
var mockFs = require('mock-fs');

var path = require('path');
var models = require('../../../server/codex/models');

describe('models', function () {
  describe('all', function () {
    beforeEach(function (done) {
      var fs = {};
      fs[path.join(__dirname, '../../../server/codex/models')] = {
        'testModel.js': 'module.exports = function () {}'
      };
      mockFs(fs);

      done();
    });

    afterEach(function (done) {
      mockFs.restore();
      done();
    });

    it('should return all models', function (done) {
      expect(models.length).to.equal(1);

      done();
    });
  });
});
