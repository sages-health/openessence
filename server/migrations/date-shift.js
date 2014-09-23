'use strict';

/**
 * Used to keep the data set centered on the current date.
 * It is useful for ensuring that demos always have nice looking (and up to date) data sets
 * This script should be scheduled with a cron job to run every night.
 */

var conf = require('./../conf/index');
var logger = conf.logger;
var client = conf.elasticsearch.newClient();

function shiftDates (callback) {
  client.get({
    index: 'date-shift',
    type: 'date-shift',
    id: '1'
  }, function (err, hit) {
    if (err) {
      return callback(err);
    }

    var version = hit._version; // in case this script gets run in parallel

    var dateToBecomeToday = hit._source.date;
    if (!dateToBecomeToday) {
      return callback(new Error('No date set in /date-shift/date-shift/1'));
    }

    dateToBecomeToday = new Date(dateToBecomeToday);

    var count = 0;
    var totalResults = 0;
    var now = Date.now();

    // TODO backup so if something goes wrong we can roll back

    client.search({
      index: 'outpatient_visit',
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
        if (!hit._source.visitDate) {
          return;
        }

        var oldDate = new Date(hit._source.visitDate);
        var newDate = new Date(now - (dateToBecomeToday.getTime() - oldDate.getTime()));

        bulkBody.push({
          update: {
            _index: hit._index,
            _type: hit._type,
            _id: hit._id
          }
        });
        bulkBody.push({
          doc: {
            visitDate: newDate
          }
        });
      });

      var finish = function () {
        // make sure we store what date we shifted to so future shifts don't get messed up
        client.index({
          index: 'date-shift',
          type: 'date-shift',
          id: '1',
          version: version,
          body: {
            date: now
          }
        }, function (err) {
          if (err) {
            return callback(err);
          }

          callback(null, count);
        });
      };

      if (bulkBody.length === 0) {
        // elasticsearch throws a cryptic exception if we try to bulk insert no records
        return finish();
      }

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
          // we're done
          finish();
        }
      });
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
    callback.apply(this, arguments);
  });
};
