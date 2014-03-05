'use strict';

var chai = require('chai');
chai.use(require('sinon-chai'));
var expect = chai.expect;

require('angular');
require('../../public/scripts/services/csrfToken');

describe('csrfToken', function () {
  var injector;
  var csrfToken;
  beforeEach(function () {
    injector = angular.injector(['fracas.services', 'ng']);
    csrfToken = injector.get('csrfToken');
  });

  it('should not work without the correct DOM element', function (done) {
    expect(csrfToken).to.be.undefined;

    done();
  });
});
