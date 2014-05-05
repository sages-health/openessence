'use strict';

var chai = require('chai');
chai.use(require('sinon-chai'));
var expect = chai.expect;
var nock = require('nock');
var request = require('supertest');
var express = require('express');

var OutpatientVisitController = require('../../../server/codex/controllers/outpatient-visit');
var conf = require('../../../server/conf');

describe('OutpatientVisitController', function () {
  afterEach(function () {
    nock.cleanAll();
  });

  describe('GET /resources/outpatient-visit/:id', function () {
    var controller;
    beforeEach(function (done) {
      controller = new OutpatientVisitController();
      done();
    });

    it('should return no results for bogus ID', function (done) {
      // mock elasticsearch
      nock(conf.elasticsearch.host)
        .get('/outpatient/visit/bogus')
        .reply(404, {
          _index: 'outpatient',
          _type: 'visit',
          _id: 'bogus',
          found: false
        });

      request(controller.middleware())
        .get('/outpatient-visit/bogus')
        .expect(404)
        .end(function (err, res) {
          if (err) {
            done(err);
            return;
          }

          expect(Object.keys(res.body)).to.be.empty;

          done();
        });
    });

    it('should return no results if user does not belong to proper district', function (done) {
      nock(conf.elasticsearch.host)
        .get('/outpatient/visit/1')
        .reply(200, {
          _index: 'outpatient',
          _type: 'visit',
          _id: '1',
          _version: 1,
          found: true,
          _source: {
            foo: 'bar',
            medicalFacility: {
              district: 'District 1'
            }
          }
        });

      var app = express();

      // mock session
      app.use(function (req, res, next) {
        req.user = {
          id: 1234,
          districts: ['District 2']
        };
        next();
      });

      app.use(controller.middleware());

      request(app)
        .get('/outpatient-visit/1')
        .expect(200)
        .end(function (err, res) {
          if (err) {
            done(err);
            return;
          }

          expect(res.body.results).to.be.empty;

          done();
        });
    });

    it('should return no results if user belongs to no districts', function (done) {
      nock(conf.elasticsearch.host)
        .get('/outpatient/visit/1')
        .reply(200, {
          _index: 'outpatient',
          _type: 'visit',
          _id: '1',
          _version: 1,
          found: true,
          _source: {
            foo: 'bar',
            medicalFacility: {
              district: 'District 1'
            }
          }
        });

      var app = express();
      app.use(function (req, res, next) {
        req.user = {
          id: 1234,
          districts: []
        };
        next();
      });

      app.use(controller.middleware());

      request(app)
        .get('/outpatient-visit/1')
        .expect(200)
        .end(function (err, res) {
          if (err) {
            done(err);
            return;
          }

          expect(res.body.results).to.be.empty;

          done();
        });
    });

    it('should return full results if user has rights to district', function (done) {
      nock(conf.elasticsearch.host)
        .get('/outpatient/visit/1')
        .reply(200, {
          _index: 'outpatient',
          _type: 'visit',
          _id: '1',
          _version: 1,
          found: true,
          _source: {
            foo: 'bar',
            medicalFacility: {
              district: 'District 1'
            }
          }
        });

      var app = express();
      app.use(function (req, res, next) {
        req.user = {
          id: 1234,
          districts: ['District 1']
        };
        next();
      });

      app.use(controller.middleware());

      request(app)
        .get('/outpatient-visit/1')
        .expect(200)
        .end(function (err, res) {
          if (err) {
            done(err);
            return;
          }

          expect(res.body.results.length).to.equal(1);

          done();
        });
    });

    it('should return full results if user has rights to _all districts', function (done) {
      nock(conf.elasticsearch.host)
        .get('/outpatient/visit/1')
        .reply(200, {
          _index: 'outpatient',
          _type: 'visit',
          _id: '1',
          _version: 1,
          found: true,
          _source: {
            foo: 'bar',
            medicalFacility: {
              district: 'District 1'
            }
          }
        });

      var app = express();
      app.use(function (req, res, next) {
        req.user = {
          id: 1234,
          districts: ['_all']
        };
        next();
      });

      app.use(controller.middleware());

      request(app)
        .get('/outpatient-visit/1')
        .expect(200)
        .end(function (err, res) {
          if (err) {
            done(err);
            return;
          }

          expect(res.body.results.length).to.equal(1);

          done();
        });
    });

    it('should return full results if user has undefined districts', function (done) {
      nock(conf.elasticsearch.host)
        .get('/outpatient/visit/1')
        .reply(200, {
          _index: 'outpatient',
          _type: 'visit',
          _id: '1',
          _version: 1,
          found: true,
          _source: {
            foo: 'bar',
            medicalFacility: {
              district: 'District 1'
            }
          }
        });

      var app = express();
      app.use(function (req, res, next) {
        req.user = {
          id: 1234
        };
        next();
      });

      app.use(controller.middleware());

      request(app)
        .get('/outpatient-visit/1')
        .expect(200)
        .end(function (err, res) {
          if (err) {
            done(err);
            return;
          }

          expect(res.body.results.length).to.equal(1);

          done();
        });
    });

  });
});
