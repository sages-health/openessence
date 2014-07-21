'use strict';

/**
 * Used to keep the data set centered on the current date.
 * It is useful for ensuring that demos always have nice looking (and up to date) data sets
 * This script should be scheduled with a cron job to run every night.
 */

var elasticsearch = require('elasticsearch');
var _ = require('lodash');
var conf = require('./conf');
var logger = conf.logger;

// don't use shared connection
var client = new elasticsearch.Client(_.clone(conf.elasticsearch));

var index = 'outpatient';
var dateToBecomeToday = conf.date;

function shiftDates (callback) {
  var count = 0;
  var totalResults = 0;
  var dateDiff = Date.now() - dateToBecomeToday.getTime();

  client.search({
    index: index,
    scroll: '30s',
    size: 1000
  }, function getMoreUntilDone (err, scrollResponse) {
    if (err) {
      return callback(err);
    }

    totalResults = scrollResponse.hits.total;

    var bulkBody = [];
    scrollResponse.hits.hits.forEach(function (hit) {
      count++;
      if (!hit._source.reportDate) {
        return;
      }

      var oldDate = new Date(hit._source.reportDate);
      var newDate = new Date(oldDate.getTime() + dateDiff);

      bulkBody.push({
        update: {
          _index: hit._index,
          _type: hit._type,
          _id: hit._id
        }
      });
      bulkBody.push({
        doc: {
          reportDate: newDate
        }
      });
    });

    client.bulk({
      body: bulkBody
    }, function (err) {
      if (err) {
        return callback(err);
      }

      if (count !== totalResults) {
        /*jshint camelcase:false */
        client.scroll({
          scrollId: scrollResponse._scroll_id,
          scroll: '30s',
          size: 1000
        }, getMoreUntilDone);
      } else {
        callback(null, count);
      }
    });
  });
}
if (!module.parent) {
  shiftDates(function (err, count) {
    client.close();

    if (err) {
      return conf.logger.error(err);
    }

    logger.info('Date shifted %d records', count);
  });
}

module.exports = function (callback) {
  callback = callback || function () {};

  shiftDates(function () {
    client.close();
    callback.apply(arguments);
  });
};
