'use strict';

var _ = require('lodash');
var extendify = require('extendify');
var moment = require('moment');
var flatten = require('flat');

var utils = require('./utils');
var config = require('./config');

// extendify is used to overwrite default value recursively
_.extend = extendify({
  inPlace: false,
  arrays: 'replace'
});

var inputDateFormat = config.inputDateFormat || 'YYYY-MM-DDThh:mm:ss.SSSZ';
var outputDateFormat = config.outputDateFormat || 'YYYY-MM-DD';

var flattenRecord = function (rec) {
  rec = flatten(rec);
  _.each(rec, function (val, key) {
    if (val === null) {
      rec[key] = val = undefined;
    }
    if (config.dataTypes.date.fields.indexOf(key) > -1) {
      rec[key] = moment(val, inputDateFormat).format(outputDateFormat);
    }
  });
  return rec;
};

var formatRecords = function (record, exportFormat) {
  // Delete paperTrail and any other props that we do not want to export
  delete record.paperTrail;

  // (exportFormat === flat ) one row per record
  if (exportFormat === 'flat') {
    // TODO: assumed all arrays are at top/first level (record.symptoms, record.diagnoses, record.syndromes)
    // before we make a record flat, make all array elements flat
    _.each(record, function (value, key) {
      if (config.dataTypes.arrayOfObjects.fields.indexOf(key) > -1) {
        record[key] = utils.flattenArray(value);
      }
    });
    return flattenRecord(record);
  }

  // (exportFormat === expanded ) 1 to n rows per record
  else if (exportFormat === 'expanded') {

    var clonedRec = _.clone(record, true);
    var result = [];
    var arrayKeys = [];
    // TODO: assumed all arrays are at top/first level (record.symptoms, record.diagnoses, record.syndromes)
    _.each(record, function (value, key) {
      if (config.dataTypes.arrayOfObjects.fields.indexOf(key) > -1) {
        arrayKeys.push(key);
      }
    });
    if (arrayKeys.length > 0) {
      _.each(arrayKeys, function (prop) {
        var list = clonedRec[prop];
        if (list && list.length > 0) {
          _.each(list, function (val) {
            // Add a placeholder record else we may lose this rec
            var obj = {};
            obj[prop] = val;
            result.push(obj);
          });
        }
        delete clonedRec[prop];
      });
    }

    if (result.length > 0) {
      _.each(result, function (value, ix) {
        var tmp = _.extend(clonedRec, value);
        result[ix] = flattenRecord(tmp);
      });
    } else {
      result = [flattenRecord(clonedRec)];
    }
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
