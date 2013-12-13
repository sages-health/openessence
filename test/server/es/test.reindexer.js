'use strict';
/* jshint -W024 */
/* jshint expr:true */

// TODO add to build

var sinon = require('sinon');
var nock = require('nock');
var expect = require('chai').expect;

var elasticsearch = require('es');
var reindexer = require('../../../server/es/reindexer');

afterEach(function () {
  nock.cleanAll();
});

describe('reindexer', function () {
  describe('#createIndex', function () {
    var esClient;
    var esServer;
    var loadIndexSettingsStub;

    beforeEach(function () {
      esClient = elasticsearch();
      esServer = nock('http://localhost:9200')
        .filteringPath(/test-(\d)+/, 'test-1')
        .filteringRequestBody(function () {
          return '*';
        })
        .post('/test-1', '*')
        .reply(201, {});

      loadIndexSettingsStub = sinon.stub(reindexer, 'loadIndexSettings', function () {
        return {
          index: {
            mappings: {}
          }
        };
      });
    });

    afterEach(function () {
      loadIndexSettingsStub.restore();
    });

    it('should POST to /test-$ID', function (done) {
      reindexer.createIndex('test', esClient, function (err, result) {
        if (err) {
          throw err;
        }

        expect(esServer.isDone()).to.be.true;
        expect(result._index).to.match(/^test-(\d)+$/);

        done();
      });
    });
  });

  describe('#getAliasNameFromIndexName', function () {
    it('should return "test" for "test-1"', function () {
      expect(reindexer.getAliasNameFromIndexName('test-1')).to.equal('test');
    });

    it('should return "test" for "test-$DATE"', function () {
      expect(reindexer.getAliasNameFromIndexName('test-' + Date.now())).to.equal('test');
    });

    it('should throw error for invalid index name', function () {
      expect(function () {
        return reindexer.getAliasNameFromIndexName('foo');
      }).to.throw(Error);
    });
  });

  describe('#getDateFromIndexName', function () {
    it('should return "1" for "test-1"', function () {
      expect(reindexer.getDateFromIndexName('test-1').getTime()).to.equal(1);
    });

    it('should return "$DATE" for "test-$DATE"', function () {
      var now = Date.now();
      expect(reindexer.getDateFromIndexName('test-' + now).getTime()).to.equal(now);
    });

    it('should throw error for invalid index name', function () {
      expect(function () {
        return reindexer.getDateFromIndexName('foo');
      }).to.throw(Error);
    });
  });

  describe('#getIndicesForAlias', function () {
    var esClient;
    var esServer;

    beforeEach(function () {
      esClient = elasticsearch();
      esServer = nock('http://localhost:9200')
        .get('/_cluster/state')
        .reply(200, {
          metadata: {
            indices: {
              'test-1': {
                state: 'open'
              },
              'test-2': {
                state: 'open'
              },
              'foo-1': {
                state: 'open'
              }
            }
          }
        });
    });

    it('should return [test-1, test-2]', function (done) {
      reindexer.getIndicesForAlias('test', esClient, function (err, indices) {
        if (err) {
          throw err;
        }

        expect(esServer.isDone()).to.be.true;
        expect(indices).to.contain('test-1');
        expect(indices).to.contain('test-2');
        expect(indices).have.length(2);

        done();
      });
    });

    it('should return [foo-1]', function (done) {
      reindexer.getIndicesForAlias('foo', esClient, function (err, indices) {
        if (err) {
          throw err;
        }

        expect(esServer.isDone()).to.be.true;
        expect(indices).to.contain('foo-1');
        expect(indices).have.length(1);

        done();
      });
    });

    it('should return [] for non-existing alias', function (done) {
      reindexer.getIndicesForAlias('bar', esClient, function (err, indices) {
        if (err) {
          throw err;
        }

        expect(esServer.isDone()).to.be.true;
        expect(indices).to.be.empty;

        done();
      });
    });
  });

  describe('#getLatestIndex', function () {
    var esClient;
    var esServer;

    beforeEach(function () {
      esClient = elasticsearch();
      esServer = nock('http://localhost:9200')
        .get('/_cluster/state')
        .reply(200, {
          metadata: {
            indices: {
              'test-1': {
                state: 'open'
              },
              'test-2': {
                state: 'open'
              },
              'foo-1': {
                state: 'open'
              }
            }
          }
        });
    });

    it('should return latest index', function (done) {
      reindexer.getLatestIndex('test', esClient, function (err, index) {
        if (err) {
          throw err;
        }

        expect(esServer.isDone()).to.be.true;
        expect(index).to.equal('test-2');

        done();
      });
    });
  });

  describe('#getOldIndices', function () {
    var esClient;

    beforeEach(function () {
      esClient = elasticsearch();
    });

    it('should return all old indices', function (done) {
      var esServer = nock('http://localhost:9200')
        .get('/_cluster/state')
        .reply(200, {
          metadata: {
            indices: {
              'test-1': {
                state: 'open'
              },
              'test-2': {
                state: 'open'
              },
              'test-3': {
                state: 'open'
              },
              'foo-1': {
                state: 'open'
              }
            }
          }
        });
      reindexer.getOldIndices('test', esClient, function (err, indices) {
        if (err) {
          throw err;
        }

        expect(esServer.isDone()).to.be.true;
        expect(indices).to.contain('test-1');
        expect(indices).to.contain('test-2');
        expect(indices).to.have.length(2);

        done();
      });
    });

    it('should return [] when no indices', function (done) {
      var esServer = nock('http://localhost:9200')
        .get('/_cluster/state')
        .reply(200, {
          metadata: {
            indices: {}
          }
        });
      reindexer.getOldIndices('test', esClient, function (err, indices) {
        if (err) {
          throw err;
        }

        expect(esServer.isDone()).to.be.true;
        expect(indices).to.be.empty;

        done();
      });
    });
  });

  describe('#getIndexForAlias', function () {
    var esClient;
    var esServer;

    beforeEach(function () {
      esClient = elasticsearch();
      esServer = nock('http://localhost:9200')
        .get('/_cluster/state')
        .reply(200, {
          metadata: {
            indices: {
              'test-1': {
                state: 'open',
                aliases: ['foo']
              },
              'test-2': {
                state: 'open',
                aliases: []
              },
              'foo-1': {
                state: 'open',
                aliases: []
              }
            }
          }
        });
    });

    it('should work even if we don\'t follow naming conventions', function (done) {
      reindexer.getIndexForAlias('foo', esClient, function (err, index) {
        if (err) {
          throw err;
        }

        expect(esServer.isDone()).to.be.true;
        expect(index).to.equal('test-1');

        done();
      });
    });

    it('should return null when no alias', function (done) {
      reindexer.getIndexForAlias('nosuchalias', esClient, function (err, index) {
        if (err) {
          throw err;
        }

        expect(esServer.isDone()).to.be.true;
        expect(index).to.be.null;

        done();
      });
    });
  });

  describe('#isJdbcRiverActive', function () {
    var esClient;

    beforeEach(function () {
      esClient = elasticsearch();
    });

    it('should return false when no rivers', function (done) {
      var esServer = nock('http://localhost:9200')
        .get('/_river/test-river/_custom')
        .reply(404, {
          error: 'IndexMissingException'
        });

      reindexer.isJdbcRiverActive('test', esClient, function (err, active) {
        if (err) {
          throw err;
        }

        expect(esServer.isDone()).to.be.true;
        expect(active).to.be.false;

        done();
      });
    });

    it('should return false when no JDBC-River', function (done) {
      var esServer = nock('http://localhost:9200')
        .get('/_river/test-river/_custom')
        .reply(404, {
          exists: false
        });

      reindexer.isJdbcRiverActive('test', esClient, function (err, active) {
        if (err) {
          throw err;
        }

        expect(esServer.isDone()).to.be.true;
        expect(active).to.be.false;

        done();
      });
    });
  });

  describe('#createJdbcRiver', function () {
    var esClient;
    var esServer;
    var loadIndexSettingsStub;

    beforeEach(function () {
      esClient = elasticsearch();
      esServer = nock('http://localhost:9200')
        .put('/_river/test-1-river/_meta')
        .reply(201, {});

      loadIndexSettingsStub = sinon.stub(reindexer, 'loadIndexSettings', function () {
        return {
          jdbcRiver: {
            type: 'jdbc',
            jdbc: {},
            index: {
              index: 'test',
              type: 'test-type'
            }
          }
        };
      });
    });

    afterEach(function () {
      loadIndexSettingsStub.restore();
    });

    it('should create JDBC River', function (done) {
      reindexer.createJdbcRiver('test-1', esClient, function (err) {
        if (err) {
          throw err;
        }

        expect(esServer.isDone()).to.be.true;

        done();
      });
    });
  });

  describe('#deleteJdbcRiver', function () {
    var esClient;

    beforeEach(function () {
      esClient = elasticsearch();
    });

    it('should DELETE /_river/test-river', function (done) {
      var esServer = nock('http://localhost:9200')
        .delete('/_river/test-river?refresh=true')
        .reply(200, {});

      reindexer.deleteJdbcRiver('test', esClient, function (err) {
        if (err) {
          throw err;
        }

        expect(esServer.isDone()).to.be.true;

        done();
      });
    });
  });

  describe('#moveAlias', function () {
    var esClient;

    beforeEach(function () {
      esClient = elasticsearch();
    });

    it('should create alias if it does not already exist', function (done) {
      var esServer = nock('http://localhost:9200')
        .get('/_cluster/state')
        .times(2)
        .reply(200, {
          metadata: {
            indices: {
              'test-1': {
                state: 'open'
              },
              'test-2': {
                state: 'open'
              }
            }
          }
        })
        .put('/test-2/_settings', {
          'refresh_interval': '1s'
        })
        .reply(200, {})
        .post('/_aliases', {
          actions: [
            {
              add: {
                index: 'test-2',
                alias: 'test'
              }
            }
          ]
        })
        .reply(201, {});

      reindexer.moveAlias('test', 'test-2', esClient, function (err) {
        if (err) {
          throw err;
        }

        expect(esServer.isDone()).to.be.true;

        done();
      });
    });
  });
});
