'use strict';

var chai = require('chai');
chai.use(require('sinon-chai'));
var expect = chai.expect;
var nock = require('nock');
var request = require('supertest');

var codex = require('../../../server/codex');
var conf = require('../../../server/conf');
var errorMiddleware = require('../../../server/error').middleware;

describe('middleware', function () {
  afterEach(function () {
    nock.cleanAll();
  });

  describe('GET /', function () {
    it('should return 404 if search not set', function (done) {
      var Model = codex.model({
        index: 'foo',
        type: 'bar'
      });

      request(codex.middleware(codex.controller(Model)))
        .get('/')
        .expect(404)
        .end(function (err) {
          if (err) {
            return done(err);
          }

          done();
        });
    });

    it('should match_all if no query is specified', function (done) {
      var esResponse = {
        took: 100,
        'timed_out': false,
        hits: {
          total: 1,
          'max_score': 1,
          hits: [
            {
              _index: 'foo',
              _type: 'bar',
              _id: '1',
              _score: 1,
              _source: {
                a: 1
              }
            }
          ]
        }
      };
      nock(conf.elasticsearch.host)
        .post('/foo/bar/_search?version=true', {
          query: {
            'match_all': {}
          }
        })
        .reply(200, esResponse);

      var Model = codex.model({
        index: 'foo',
        type: 'bar'
      });

      request(codex.middleware(codex.controller(Model, {search: true})))
        .get('/')
        .expect(200)
        .end(function (err, res) {
          if (err) {
            return done(err);
          }

          expect(res.body).to.deep.equal({
            total: esResponse.hits.total,
            results: [
              {
                _id: '1',
                _score: 1,
                _source: {a: 1}
              }
            ]
          });

          done();
        });
    });

    it('should pass any q parameters to elasticsearch', function (done) {
      var esResponse = {
        took: 100,
        'timed_out': false,
        hits: {
          total: 0,
          hits: []
        }
      };
      nock(conf.elasticsearch.host)
        .post('/foo/bar/_search?version=true', {
          query: {
            'query_string': {
              query: 'hello'
            }
          }
        })
        .reply(200, esResponse);

      var Model = codex.model({
        index: 'foo',
        type: 'bar'
      });

      request(codex.middleware(codex.controller(Model, {search: true})))
        .get('/?q=hello')
        .expect(200)
        .end(function (err) {
          if (err) {
            return done(err);
          }

          done();
        });
    });

  });

  describe('GET /:id', function () {
    it('should work', function (done) {
      var esResponse = {
        _index: 'foo',
        _type: 'bar',
        _id: '1',
        _version: 1,
        found: true,
        _source: {}
      };

      nock(conf.elasticsearch.host)
        .get('/foo/bar/1')
        .reply(200, esResponse);

      var Model = codex.model({
        index: 'foo',
        type: 'bar'
      });

      request(codex.middleware(codex.controller(Model, {get: true})))
        .get('/1')
        .expect(200)
        .end(function (err, res) {
          if (err) {
            return done(err);
          }

          expect(res.body).to.deep.equal({
            _id: esResponse._id,
            _version: esResponse._version,
            _source: esResponse._source
          });

          done();
        });
    });

    it('should return 404 if document not found', function (done) {
      var esResponse = {
        found: false
      };
      nock(conf.elasticsearch.host)
        .get('/foo/bar/1')
        .reply(404, esResponse);

      var Model = codex.model({
        index: 'foo',
        type: 'bar'
      });

      request(codex.middleware(codex.controller(Model, {get: true})).use(errorMiddleware))
        .get('/1')
        .expect(404)
        .end(function (err, res) {
          if (err) {
            return done(err);
          }

          expect(res.body).to.deep.equal({});

          done();
        });
    });
  });

  describe('POST /', function () {
    it('should work if insert:true', function (done) {
      var esResponse = {
        _index: 'foo',
        _type: 'bar',
        _id: '1',
        _version: 1,
        created: true
      };
      nock(conf.elasticsearch.host)
        .post('/foo/bar', {a: 1})
        .reply(201, esResponse);

      var Model = codex.model({
        index: 'foo',
        type: 'bar'
      });

      request(codex.middleware(codex.controller(Model, {insert: true})))
        .post('/')
        .send({a: 1})
        .expect(201)
        .end(function (err, res) {
          if (err) {
            return done(err);
          }

          expect(res.body).to.deep.equal({
            _id: '1',
            _version: 1
          });

          done();
        });
    });
  });

  describe('POST /:id', function () {
    it('should return 404', function (done) {
      request(codex.middleware(codex.controller(codex.model({}))))
        .post('/1')
        .expect(404)
        .end(function (err) {
          if (err) {
            return done(err);
          }

          done();
        });
    });
  });

  describe('POST /search', function () {
    it('should support aggregations', function (done) {
      var esResponse = {
        took: 138,
        'timed_out': false,
        hits: {
          total: 1,
          'max_score': 0,
          hits: []
        },
        aggregations: {
          'min_weight': {
            value: 12
          }
        }
      };
      var aggs = {
        'min_weight': {
          min: {
            field: 'weight'
          }
        }
      };
      nock(conf.elasticsearch.host)
        .post('/foo/bar/_search?version=true&size=0', {
          query: {
            'match_all': {}
          },
          aggregations: aggs
        })
        .reply(200, esResponse);

      var Model = codex.model({
        index: 'foo',
        type: 'bar'
      });

      request(codex.middleware(codex.controller(Model, {search: true})))
        .post('/search')
        .send({aggregations: aggs})
        .expect(200)
        .end(function (err, res) {
          if (err) {
            return done(err);
          }

          expect(res.body).to.deep.equal({
            total: 1,
            results: [],
            aggregations: esResponse.aggregations
          });

          done();
        });
    });
  });

  describe('PUT /:id', function () {
    it('should work', function (done) {
      var esResponse = {
        _index: 'foo',
        _type: 'bar',
        _id: '1',
        _version: 1,
        created: true
      };
      nock(conf.elasticsearch.host)
        .post('/foo/bar/1', {a: 1})
        .reply(201, esResponse);

      var Model = codex.model({
        index: 'foo',
        type: 'bar'
      });

      request(codex.middleware(codex.controller(Model, {replace: true})))
        .put('/1')
        .send({a: 1})
        .expect(201)
        .end(function (err, res) {
          if (err) {
            return done(err);
          }

          expect(res.body).to.deep.equal({
            _id: '1',
            _version: 1
          });

          done();
        });
    });
  });

  describe('DELETE /:id', function () {
    it('should work if delete: true', function (done) {
      var esResponse = {
        _index: 'foo',
        _type: 'bar',
        _id: '1',
        _version: 2,
        found: true
      };

      nock(conf.elasticsearch.host)
        .delete('/foo/bar/1')
        .reply(200, esResponse);

      var Model = codex.model({
        index: 'foo',
        type: 'bar'
      });

      request(codex.middleware(codex.controller(Model, {delete: true})))
        .delete('/1')
        .expect(200)
        .end(function (err, res) {
          if (err) {
            return done(err);
          }

          expect(res.body).to.deep.equal({
            _id: '1',
            _version: 2
          });

          done();
        });
    });

    it('should return 404 if document not found', function (done) {
      var esResponse = {
        _index: 'foo',
        _type: 'bar',
        _id: '1',
        _version: 1,
        found: false
      };

      nock(conf.elasticsearch.host)
        .delete('/foo/bar/1')
        .reply(404, esResponse);

      var Model = codex.model({
        index: 'foo',
        type: 'bar'
      });

      request(codex.middleware(codex.controller(Model)))
        .delete('/1')
        .expect(404)
        .end(function (err, res) {
          if (err) {
            return done(err);
          }

          expect(res.body).to.deep.equal({});

          done();
        });
    });
  });
});
