'use strict';

var chai = require('chai');
chai.use(require('sinon-chai'));
var expect = chai.expect;
var nock = require('nock');
var request = require('supertest');
var express = require('express');

var codex = require('../../../server/codex');
var conf = require('../../../server/conf');

describe('OutpatientVisitController', function () {
  afterEach(function () {
    nock.cleanAll();
  });

  var addUser = function (user) {
    return function (req, res, next) {
      req.user = user;
      next();
    };
  };

  describe('GET /resources/outpatient-visit/:id', function () {
    var notFoundRecord = {
      _index: 'outpatient',
      _type: 'visit',
      _id: '1'
    };

    var expectedRecord = {
      _index: 'outpatient',
      _type: 'visit',
      _id: '1',
      _version: 1,
      _source: {
        foo: 'bar',
        medicalFacility: {
          district: 'District 1'
        }
      }
    };

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

      request(codex())
        .get('/outpatient-visit/bogus')
        .expect(404)
        .end(function (err, res) {
          if (err) {
            done(err);
            return;
          }

          // TODO this will change when we don't return error on 404
          expect(res.body).to.deep.equal({});

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
      app.use(addUser({ // mock user
        id: 1234,
        districts: ['District 2']
      }));
      app.use(codex());

      request(app)
        .get('/outpatient-visit/1')
        .expect(404)
        .end(function (err, res) {
          if (err) {
            done(err);
            return;
          }

          expect(res.body).to.deep.equal(notFoundRecord);

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
      app.use(addUser({
        id: 1234,
        districts: []
      }));

      app.use(codex());

      request(app)
        .get('/outpatient-visit/1')
        .expect(404)
        .end(function (err, res) {
          if (err) {
            done(err);
            return;
          }

          expect(res.body).to.deep.equal(notFoundRecord);

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
      app.use(addUser({
        id: 1234,
        districts: ['District 1']
      }));

      app.use(codex());

      request(app)
        .get('/outpatient-visit/1')
        .expect(200)
        .end(function (err, res) {
          if (err) {
            done(err);
            return;
          }

          expect(res.body).to.deep.equal(expectedRecord);

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
      app.use(addUser({
        id: 1234,
        districts: ['_all']
      }));
      app.use(codex());

      request(app)
        .get('/outpatient-visit/1')
        .expect(200)
        .end(function (err, res) {
          if (err) {
            done(err);
            return;
          }

          expect(res.body).to.deep.equal(expectedRecord);

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
      app.use(addUser({
        id: 1234
      }));
      app.use(codex());

      request(app)
        .get('/outpatient-visit/1')
        .expect(200)
        .end(function (err, res) {
          if (err) {
            done(err);
            return;
          }

          expect(res.body).to.deep.equal(expectedRecord);

          done();
        });
    });

  });

  describe('GET /outpatient-visit', function () {
    it('should filter results by user\'s district', function (done) {
      nock(conf.elasticsearch.host)
        .post('/outpatient/visit/_search', {
          query: {
            filtered: {
              filter: {
                terms: {
                  'medicalFacility.district.raw': {
                    index: 'user',
                    type: 'user',
                    id: 1234,
                    path: 'districts.raw'
                  },
                  '_cache_key': 'outpatient_visit_user_user_1234'
                }
              },
              query: {
                'match_all': {}
              }
            }
          }
        })
        .reply(200, {
          took: 100,
          'timed_out': false,
          _shards: {
            total: 5,
            successful: 5,
            failed: 0
          },
          hits: {
            total: 1,
            'max_score': 1,
            hits: [
              {
                _index: 'outpatient',
                _type: 'visit',
                _id: '1',
                _score: 1,
                _source: {
                  medicalFacility: {
                    district: 'District 1'
                  }
                }
              }
            ]
          }
        });

      var app = express();
      app.use(addUser({
        id: 1234,
        districts: ['District 1']
      }));
      app.use(codex());

      request(app)
        .get('/outpatient-visit')
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

  describe('POST /outpatient-visit', function () {
    /*jshint quotmark:false */
    it("should return 403 if user doesn't have rights to district", function (done) {
      var app = express();
      app.use(addUser({
        id: 1234,
        districts: []
      }));
      app.use(codex());

      request(app)
        .post('/outpatient-visit')
        .send({
          medicalFacility: {
            district: 'District 1'
          }
        })
        .expect(403)
        .end(function (err) {
          if (err) {
            done(err);
            return;
          }

          done();
        });
    });

    it('should return 201 if user does have rights to district', function (done) {
      var requestBody = {
        medicalFacility: {
          district: 'District 1'
        }
      };

      nock(conf.elasticsearch.host)
        .filteringPath(/(\?.*)?$/, '?params')
        .post('/outpatient/visit?params', requestBody)
        .reply(201, {
          _index: 'outpatient',
          _type: 'visit',
          _id: 'randomID',
          _version: 1,
          created: true
        });
      var app = express();
      app.use(addUser({
        id: 1234,
        districts: ['District 1']
      }));
      app.use(codex());

      request(app)
        .post('/outpatient-visit')
        .send(requestBody)
        .expect(201)
        .end(function (err) {
          if (err) {
            done(err);
            return;
          }

          done();
        });
    });
  });

  describe('POST /outpatient-visit/:id', function () {
    it('should return 404', function (done) {
      var app = express();
      app.use(codex());

      request(app)
        .post('/outpatient-visit/1')
        .expect(404)
        .end(function (err) {
          if (err) {
            done(err);
            return;
          }

          done();
        });
    });
  });

  describe('DELETE /outpatient-visit/:id', function () {
    /*jshint quotmark:false */
    it("should return 403 if user doesn't have rights to district", function (done) {
      nock(conf.elasticsearch.host)
        .get('/outpatient/visit/1')
        .reply(200, {
          _index: 'outpatient',
          _type: 'visit',
          _id: '1',
          _version: 1,
          found: true,
          _source: {
            medicalFacility: {
              district: 'District 1'
            }
          }
        });

      var app = express();
      app.use(addUser({
        id: 1234,
        districts: []
      }));
      app.use(codex());

      request(app)
        .delete('/outpatient-visit/1')
        .expect(403)
        .end(function (err) {
          if (err) {
            done(err);
            return;
          }

          done();
        });
    });

    it('should return 200 if user does have rights to district', function (done) {
      nock(conf.elasticsearch.host)
        .get('/outpatient/visit/1')
        .reply(200, {
          _index: 'outpatient',
          _type: 'visit',
          _id: '1',
          _version: 1,
          found: true,
          _source: {
            medicalFacility: {
              district: 'District 1'
            }
          }
        })
//        .filteringPath(/(\?.*)?$/, '?params') // FIXME this doesn't work
        .delete('/outpatient/visit/1?refresh=true')
        .reply(200, {
          _index: 'outpatient',
          _type: 'visit',
          _id: '1',
          _version: 2, // this doesn't matter for this test, but delete does increment the version number
          found: true
        });

      var app = express();
      app.use(addUser({
        id: 1234,
        districts: ['District 1']
      }));
      app.use(codex());

      request(app)
        .delete('/outpatient-visit/1')
        .expect(200)
        .end(function (err) {
          if (err) {
            done(err);
            return;
          }

          done();
        });
    });
  });
});
