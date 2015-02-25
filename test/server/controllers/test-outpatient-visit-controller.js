'use strict';

var chai = require('chai');
chai.use(require('sinon-chai'));
var expect = chai.expect;
var nock = require('nock');
var request = require('supertest');
var express = require('express');

var codex = require('../../../server/codex');
var conf = require('../../../server/conf');
var User = require('../../../server/models/User');
var OutpatientVisitController = require('../../../server/controllers/OutpatientVisitController');
var errorMiddleware = require('../../../server/error').middleware;

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

  describe('GET /:id', function () {
    var expectedRecord = {
      _id: '1',
      _version: 1,
      _source: {
        foo: 'bar',
        medicalFacility: {
          name: 'District 1'
        }
      }
    };

    it('should return no results if user does not belong to proper location', function (done) {
      nock(conf.elasticsearch.host)
        .get('/outpatient_visit/outpatient_visit/1')
        .reply(200, {
          _index: 'outpatient',
          _type: 'visit',
          _id: '1',
          _version: 1,
          found: true,
          _source: {
            foo: 'bar',
            medicalFacility: {
              name: 'District 1'
            }
          }
        });

      var app = express();
      app.use(addUser(new User({ // mock user
        locations: ['District 2']
      })));
      app.use(codex.middleware(OutpatientVisitController))
        .use(errorMiddleware);

      request(app)
        .get('/1')
        .expect(403)
        .end(function (err) {
          if (err) {
            return done(err);
          }

          done();
        });
    });

    it('should return no results if user belongs to no locations', function (done) {
      nock(conf.elasticsearch.host)
        .get('/outpatient_visit/outpatient_visit/1')
        .reply(200, {
          _index: 'outpatient',
          _type: 'visit',
          _id: '1',
          _version: 1,
          found: true,
          _source: {
            foo: 'bar',
            medicalFacility: {
              name: 'District 1'
            }
          }
        });

      var app = express();
      app.use(addUser(new User({
        locations: []
      })));
      app.use(codex.middleware(OutpatientVisitController))
        .use(errorMiddleware);

      request(app)
        .get('/1')
        .expect(403)
        .end(function (err) {
          if (err) {
            done(err);
            return;
          }

          done();
        });
    });

    it('should return full results if user has rights to location', function (done) {
      nock(conf.elasticsearch.host)
        .get('/outpatient_visit/outpatient_visit/1')
        .reply(200, {
          _index: 'outpatient',
          _type: 'visit',
          _id: '1',
          _version: 1,
          found: true,
          _source: {
            foo: 'bar',
            medicalFacility: {
              name: 'District 1'
            }
          }
        });

      var app = express();
      app.use(addUser(new User({
        locations: ['District 1']
      })));

      app.use(codex.middleware(OutpatientVisitController))
        .use(errorMiddleware);

      request(app)
        .get('/1')
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

    it('should return full results if user has all_location role', function (done) {
      nock(conf.elasticsearch.host)
        .get('/outpatient_visit/outpatient_visit/1')
        .reply(200, {
          _index: 'outpatient',
          _type: 'visit',
          _id: '1',
          _version: 1,
          found: true,
          _source: {
            foo: 'bar',
            medicalFacility: {
              name: 'District 1'
            }
          }
        });

      var app = express();
      app.use(addUser(new User({
        roles: ['all_location']
      })));
      app.use(codex.middleware(OutpatientVisitController))
        .use(errorMiddleware);

      request(app)
        .get('/1')
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

    it('should return full results if user has undefined locations', function (done) {
      nock(conf.elasticsearch.host)
        .get('/outpatient_visit/outpatient_visit/1')
        .reply(200, {
          _index: 'outpatient',
          _type: 'visit',
          _id: '1',
          _version: 1,
          found: true,
          _source: {
            foo: 'bar',
            medicalFacility: {
              name: 'District 1'
            }
          }
        });

      var app = express();
      app.use(addUser(new User()));
      app.use(codex.middleware(OutpatientVisitController))
        .use(errorMiddleware);

      request(app)
        .get('/1')
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

  describe('GET /', function () {
    it('should filter results by user\'s location', function (done) {
      nock(conf.elasticsearch.host)
        .post('/outpatient_visit/outpatient_visit/_search?version=true', {
          query: {
            filtered: {
              filter: {
                terms: {
                  'medicalFacility.name.raw': {
                    index: 'user',
                    type: 'user',
                    id: 1234,
                    path: 'locations.raw',
                    cache: false
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
                _version: 1,
                _source: {
                  medicalFacility: {
                    name: 'District 1'
                  }
                }
              }
            ]
          }
        });

      var app = express();
      app.use(addUser(new User({locations: ['District 1']}, {id: '1234'})));
      app.use(codex.middleware(OutpatientVisitController))
        .use(errorMiddleware);

      request(app)
        .get('/')
        .expect(200)
        .end(function (err, res) {
          if (err) {
            return done(err);
          }

          expect(res.body.results.length).to.equal(1);

          done();
        });
    });
  });

  describe('POST /', function () {
    /*jshint quotmark:false */
    it("should return 403 if user doesn't have rights to location", function (done) {
      var app = express();
      app.use(addUser(new User({locations: []})));
      app.use(codex.middleware(OutpatientVisitController))
        .use(errorMiddleware);

      request(app)
        .post('/')
        .send({
          medicalFacility: {
            name: 'District 1'
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

    it('should return 201 if user does have rights to location', function (done) {
      var requestBody = {
        medicalFacility: {
          name: 'District 1'
        }
      };

      nock(conf.elasticsearch.host)
        .filteringRequestBody(function (body) {
          if (!body) {
            return false;
          }

          body = JSON.parse(body);
          if (!body.paperTrail) {
            return false;
          }

          return 'body';
        })
        .post('/outpatient_visit/outpatient_visit?refresh=true', 'body')
        .reply(201, {
          _index: 'outpatient',
          _type: 'visit',
          _id: 'randomID',
          _version: 1,
          created: true
        });
      var app = express();
      app.use(addUser(new User({locations: ['District 1']})));
      app.use(codex.middleware(OutpatientVisitController))
        .use(errorMiddleware);

      request(app)
        .post('/')
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

  describe('DELETE /:id', function () {
    /*jshint quotmark:false */
    it("should return 403 if user doesn't have rights to location", function (done) {
      nock(conf.elasticsearch.host)
        .get('/outpatient_visit/outpatient_visit/1')
        .reply(200, {
          _index: 'outpatient',
          _type: 'visit',
          _id: '1',
          _version: 1,
          found: true,
          _source: {
            medicalFacility: {
              name: 'District 1'
            }
          }
        });

      var app = express();
      app.use(addUser(new User({locations: []})));
      app.use(codex.middleware(OutpatientVisitController))
        .use(errorMiddleware);

      request(app)
        .delete('/1')
        .expect(403)
        .end(function (err) {
          if (err) {
            return done(err);
          }

          done();
        });
    });

    it('should return 200 if user does have rights to location', function (done) {
      nock(conf.elasticsearch.host)
        .get('/outpatient_visit/outpatient_visit/1')
        .reply(200, {
          _index: 'outpatient',
          _type: 'visit',
          _id: '1',
          _version: 1,
          found: true,
          _source: {
            medicalFacility: {
              name: 'District 1'
            }
          }
        })
        .delete('/outpatient_visit/outpatient_visit/1?refresh=true')
        .reply(200, {
          _index: 'outpatient',
          _type: 'visit',
          _id: '1',
          _version: 2, // this doesn't matter for this test, but delete does increment the version number
          found: true
        });

      var app = express();
      app.use(addUser(new User({locations: ['District 1']})));
      app.use(codex.middleware(OutpatientVisitController))
        .use(errorMiddleware);

      request(app)
        .delete('/1')
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

  describe('PUT /:id', function () {
    it('should work if user is an admin', function (done) {
      var requestBody = {
        medicalFacility: {
          name: 'District 1'
        }
      };

      var es = nock(conf.elasticsearch.host)
        .get('/outpatient_visit/outpatient_visit/1')
        .reply(200, {
          _index: 'outpatient',
          _type: 'visit',
          _id: '1',
          _version: 1,
          found: true,
          _source: requestBody
        })
        .filteringRequestBody(function (body) {
          if (!body) {
            return false;
          }

          body = JSON.parse(body);
          if (!body.paperTrail) {
            return false;
          }

          return 'body';
        })
        .post('/outpatient_visit/outpatient_visit/1?refresh=true', 'body')
        .reply(201, {
          _index: 'outpatient',
          _type: 'visit',
          _id: '1',
          _version: 1,
          created: true
        });
      var app = express();
      app.use(addUser(new User({roles: ['admin']})));
      app.use(codex.middleware(OutpatientVisitController))
        .use(errorMiddleware);

      request(app)
        .put('/1')
        .send(requestBody)
        .expect(201)
        .end(function (err) {
          if (err) {
            return done(err);
          }

          expect(es.isDone()).to.be.true;

          done();
        });
    });

    it('should add submissionDate when creating new document', function (done) {
      var es = nock(conf.elasticsearch.host)
        .get('/outpatient_visit/outpatient_visit/1')
        .reply(404, {
          _index: 'outpatient',
          _type: 'visit',
          _id: '1',
          found: false
        })
        .filteringRequestBody(function (body) {
          if (!body) {
            return false;
          }

          body = JSON.parse(body);
          expect(body.submissionDate).to.be.ok;

          return 'body';
        })
        .post('/outpatient_visit/outpatient_visit/1?refresh=true', 'body')
        .reply(201, {
          _index: 'outpatient',
          _type: 'visit',
          _id: '1',
          _version: 1,
          created: true
        });

      var app = express();
      app.use(addUser(new User({roles: ['admin']})));
      app.use(codex.middleware(OutpatientVisitController))
        .use(errorMiddleware);

      request(app)
        .put('/1')
        .send({foo: 'bar'})
        .expect(201)
        .end(function (err) {
          if (err) {
            return done(err);
          }

          expect(es.isDone()).to.be.true;

          done();
        });
    });
  });
});
