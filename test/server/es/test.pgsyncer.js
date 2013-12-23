'use strict';
/* jshint -W024 */
/* jshint expr:true */

var chai = require('chai');
chai.use(require('sinon-chai'));
var expect = chai.expect;
var sinon = require('sinon');
var nock = require('nock');
var elasticsearch = require('es');
var EventEmitter = require('events').EventEmitter;
var PgSyncer = require('../../../server/es/pgsyncer');
var sequelize = require('../../../server/models').sequelize;
var reindexer = require('../../../server/es/reindexer');
var NoopLock = require('../../../server/locks/nooplock');

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

      syncer.lock = new NoopLock();
      syncer.reindexBarrier = {
        await: function (callback) {
          callback(null, sinon.spy());
        }
      };

      syncer.sync(function (err) {
        if (err) {
          throw err;
        }
        pgClient.emit('notification', {
          channel: 'test_table_insert',
          payload: '1'
        });
      }, function (err) {
        if (err) {
          throw err;
        }
        expect(esServer.isDone()).to.be.true;

        done();
      });
    });
  });

  describe('#sync', function () {
    var pgClient;

    beforeEach(function () {
      pgClient = new EventEmitter();
      pgClient.query = sinon.stub();
    });


    it('should handle writes in order', function (done) {
      var esServers = {};
      for (var i = 1; i < 4; i++) {
        esServers[i] = nock('http://localhost:9200')
          .delete('/test/test-type/' + i)
          .reply(200, {});
      }

      var syncer = new PgSyncer({
        pgClient: pgClient,
        esClient: elasticsearch(),
        alias: 'test',
        type: 'test-type',
        table: 'test_table',
        channels: ['test_table_delete']
      });

      syncer.lock = new NoopLock();
      syncer.reindexBarrier = {
        await: function (callback) {
          callback(null, sinon.spy());
        }
      };
      var progress = 0;

      syncer.sync(function (err) {
        if (err) {
          throw err;
        }
        for (var i = 1; i < 4; i++) {
          pgClient.emit('notification', {
            channel: 'test_table_delete',
            payload: i
          });
        }
      }, function (err) {
        if (err) {
          throw err;
        }
        progress++;

        expect(esServers[progress].isDone()).to.be.true;

        if (progress === 3) { // wait until all DELETEs are processed
          done();
        }
      });
    });
  });

  // TODO more tests
});
