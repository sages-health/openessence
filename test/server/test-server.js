'use strict';

var chai = require('chai');
chai.use(require('sinon-chai'));
var expect = chai.expect;
var nock = require('nock');
var request = require('supertest');
var cheerio = require('cheerio');

var server = require('../../server/index');

describe('server', function () {
  afterEach(function () {
    nock.cleanAll();
  });

  var getCsrfToken = function (res) {
    var $ = cheerio.load(res.text);
    return $('meta[name="_csrf"]').attr('content');
  };

  describe('locale', function () {
    it('should redirect / to /en if Accept-Language is en-US', function (done) {
      request(server)
        .get('/')
        .set('Accept-Language', 'en-US')
        .expect(307)
        .expect('Location', '/en')
        .end(function (err) {
          if (err) {
            return done(err);
          }

          done();
        });
    });

    it('should redirect / to /es if Accept-Language is es', function (done) {
      request(server)
        .get('/')
        .set('Accept-Language', 'es')
        .expect(307)
        .expect('Location', '/es')
        .end(function (err) {
          if (err) {
            return done(err);
          }

          done();
        });
    });

    it('should set lang based on URL', function (done) {
      request(server)
        .get('/es/')
        .expect(200)
        .end(function (err, res) {
          if (err) {
            return done(err);
          }

          var $ = cheerio.load(res.text);
          var lang = $('html').attr('lang');
          expect(lang).to.equal('es');

          done();
        });
    });
  });

  it('should set CSRF token', function (done) {
    request(server)
      .get('/en/')
      .expect(200)
      .end(function (err, res) {
        if (err) {
          return done(err);
        }

        expect(getCsrfToken(res)).to.not.be.empty;

        done();
      });
  });

  it('should return 403 if client doesn\'t send CSRF token', function (done) {
    request(server)
      .post('/session')
      .expect(403)
      .end(function (err) {
        if (err) {
          return done(err);
        }

        done();
      });
  });

  // TODO figure out how to mock sessions and CSRF tokens

  it('should return 404 for /${boguspath}', function (done) {
    request(server)
      .get('/boguspath') // /en/foo is handled by the client, but everything w/o the locale is handled by the server
      .expect(404)
      .end(function (err) {
        if (err) {
          return done(err);
        }

        done();
      });
  });

});
