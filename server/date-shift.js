/*
  Used to keep the data set centered on the current date.
  It is useful for ensuring that demos always have nice looking  (and up to date) data sets
  This script should be scheduled with a cron job to run every night.
 */
'use strict';

var elasticsearch = require('elasticsearch');
var _ = require('lodash');
var conf = require('./conf');
var logger = conf.logger;

// don't use shared connection
var client = new elasticsearch.Client(_.clone(conf.elasticsearch));

var index = 'outpatient';
var dateToBecomeToday = new Date('2010', '03', '16'); // YYYY MM DD

function shiftDates () {
  var count = 0;
  var totalResults = 0;
  var dateDiff = Date.now() - dateToBecomeToday.getTime();
  var abort = false;

  client.search({
    index: index,
    scroll: '30s',
    size: 1000
  }, function getMoreUntilDone(err, scrollResponse) {
    if (err) {
      abort = true;
      logger.error(err);
    }

    totalResults = scrollResponse.hits.total;

    var bulkBody = [];
    scrollResponse.hits.hits.forEach(function (hit) {
      count++;
      if (!hit._source.reportDate) {
        return;
      }

      var oldDate = new Date(hit._source.reportDate);
      var newDate = new Date(oldDate.getTime() + dateDiff);// (24 * 60 * 60 * 1000 * daysForward));

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
        abort = true;
        logger.error(err);
      }

      if (count !== totalResults && !abort) {
        /*jshint camelcase:false */
        client.scroll({
          scrollId: scrollResponse._scroll_id,
          scroll: '30s',
          size: 1000
        }, getMoreUntilDone);
      } else {
        client.close();
        console.log('Updated ' + count + ' records.');
      }
    });
  });
}
if (!module.parent) {
  shiftDates();
}

module.exports = shiftDates;
