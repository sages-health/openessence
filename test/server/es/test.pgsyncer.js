'use strict';
/* jshint -W024 */
/* jshint expr:true */

var expect = require('chai').expect;
var sinon = require('sinon');
var nock = require('nock');
var elasticsearch = require('es');
var EventEmitter = require('events').EventEmitter;
var PgSyncer = require('../../../server/es/pgsyncer');
var sequelize = require('../../../server/models').sequelize;

describe('pgsyncer', function () {
  afterEach(function () {
    nock.cleanAll();
  });

  describe('#sync: insert', function () {
    var pgClient;
    var sequelizeStub;

    beforeEach(function () {
      pgClient = new EventEmitter();
      pgClient.query = sinon.stub();

      sequelizeStub = sinon.stub(sequelize, 'query', function () {
        return {
          complete: function (callback) {
            callback(null, [
              {
                _id: '1',
                foo: 'bar'
              }
            ]);
          }
        };
      });
    });

    afterEach(function () {
      sequelizeStub.restore();
    });

    it('should PUT to elasticsearch', function (done) {
      var esServer = nock('http://localhost:9200')
        .put('/test/test-type/1', {
          _id: 1,
          foo: 'bar'
        })
        .reply(201, {});

      var syncer = new PgSyncer({
        pgClient: pgClient,
        esClient: elasticsearch(),
        alias: 'test',
        type: 'test-type',
        table: 'test_table',
        channels: ['test_table_insert']
      });

      syncer.sync(function (err) {
        if (err) {
          throw err;
        }
      });

      pgClient.emit('notification', {
        channel: 'test_table_insert',
        payload: '1'
      });

      expect(esServer.isDone()).to.be.true;

      done();
    });
  });

  // TODO more tests
});
