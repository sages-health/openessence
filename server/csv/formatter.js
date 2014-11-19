'use strict';

var _ = require('lodash');
var extendify = require('extendify');
var moment = require('moment');
var flatten = require('flat');

var config = require('./config');
var utils = require('./utils');

// extendify is used to overwrite default value recursively
_.extend = extendify({
  inPlace: false,
  arrays: 'replace'
});

var formatRecords = function (record, exportFormat) {
  // Delete paperTrail and any other props that we do not want to export
  delete record.paperTrail;
  var inputDateFormat = config.inputDateFormat || 'YYYY-MM-DDThh:mm:ss.SSSZ';
  var outputDateFormat = config.outputDateFormat || 'YYYY-MM-DD';

  // (exportFormat === flat ) one row per record
  if (exportFormat === 'flat') {
    // TODO: assumed all arrays are at top/first level (record.symptoms, record.diagnoses, record.syndromes)
    // before we make a record flat, make all array elements flat
    _.each(record, function (value, key) {
      if (_.isArray(value)) {
        record[key] = utils.flattenArray(value);
      }
    });

    var res = flatten(record);
    _.each(res, function (value, key) {
      if (moment(value, inputDateFormat, true).isValid()) { //TODO: need better check for a date (elasticsearch date format)
        res[key] = moment(value, inputDateFormat).format(outputDateFormat);
      }
    });
    return res;
  }
  // (exportFormat === expanded ) 1 to n rows per record
  else if (exportFormat === 'expanded') {

    var recordClone = _.clone(record, true);
    var result = [];
    var arrayKeys = [];
    // TODO: assumed all arrays are at top/first level (record.symptoms, record.diagnoses, record.syndromes)
    _.each(record, function (value, key) {
      if (_.isArray(value)) {
        arrayKeys.push(key);
      }
    });
    if (arrayKeys.length > 0) {
      _.each(arrayKeys, function (prop) {
        var list = recordClone[prop];
        if (list.length > 0) {
          _.each(list, function (val) {
            // Add a placeholder record else we may lose this rec
            var obj = {};
            obj[prop] = val;
            result.push(obj);
          });
        } else {
          // Add a placeholder record else we may lose this rec
          var obj = {};
          obj[prop] = undefined;
          result.push(obj);
        }
        delete recordClone[prop];
      });
    }
    _.each(result, function (value, ix) {
      value = _.extend(recordClone, value);
      value = flatten(value);
      _.each(value, function (val, key) {
        if (moment(val, inputDateFormat, true).isValid()) { //TODO: need better check for a date (elasticsearch date format)
          value[key] = moment(val, inputDateFormat).format(outputDateFormat);
        }
      });
      result[ix] = value;
    });
    return result;
  }
  else {
    //TODO
  }

};

var format = function (data, exportFormat) {
  var formattedRecords = [];
  data.forEach(function (rec) {
    // use default template to ensure all field are populated
    var completeRec = _.extend(config.template, rec.doc);

    // Add record ID that can be used to uniquely identify records
    completeRec.id = rec.id;

    // if flat export format ==> 1 record returned
    // if vertical export format ==> 1 to n records returned
    var recs = formatRecords(completeRec, exportFormat);

    if (_.isArray(recs)) {
      _.each(recs, function (rec) {
        formattedRecords.push(rec);
      });
    } else {
      formattedRecords.push(recs);
    }
  });
  return formattedRecords;
};

module.exports = {
  format: format
};
