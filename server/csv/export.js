'use strict';

var express = require('express');
var OutpatientVisit = require('./../models/OutpatientVisit');
var Form = require('./../models/Form');

var converter = require('json2csv');
var path = require('path');
var fs = require('fs');
var os = require('os');
var crypto = require('crypto');

var flatten = require('flat');

var fs = require('fs');
var path = require('path');

var config = require('./config');
var dataFormatter = require('./formatter');

module.exports = function reportsMiddleware () {
  var app = express();
  var getFilename = function (filename, user) {
    return crypto.createHash('sha1')
      .update(filename + user.username)
      .digest('hex') + '.csv';
  };

  var download = function (res, filepath, filename) {
    res.download(filepath, filename, function () {
      fs.exists(filepath, function (exists) {
        if (exists) {
          fs.unlink(filepath);
        }
      });
    });
  };

  // TODO: remove hardcoded field names
  var getFields = function (fields, formFields, format) {
    var fldsEnabled = ['id'];
    var fieldIds = Object.keys(fields);
    if (format === 'expanded') {
      fieldIds.push('symptoms.name');
      fieldIds.push('symptoms.count');
      fieldIds.push('diagnoses.name');
      fieldIds.push('diagnoses.count');
      fieldIds.push('disposition.name');
      fieldIds.push('disposition.count');
    }
    formFields.forEach(function (fld) {
      if (fld.enabled) {
        if (format === 'expanded' && ['symptoms', 'diagnoses', 'disposition'].indexOf(fld.name) > -1) {
          fldsEnabled.push(fld.name + '.name');
          fldsEnabled.push(fld.name + '.count');
        } else if (fld.name === 'medicalFacility') {
          fldsEnabled.push(fld.name + '.name');
        } else if (fld.name === 'patient.age') {
          fldsEnabled.push(fld.name + '.years');
        } else {
          fldsEnabled.push(fld.name);
        }
      }
    });

    return fieldIds.filter(function (v) {
      return fldsEnabled.indexOf(v) > -1;
    });
  };

//  app.get('/:name', function (req, res) {
  app.get('/', function (req, res) {

    var paramsAsString = new Buffer(req.query.params, 'base64').toString('binary');
    var requestParams = JSON.parse(paramsAsString);

    requestParams.delimiter = requestParams.delimiter || ',';
    requestParams.format = requestParams.format || 'flat';
    requestParams.filename = requestParams.filename || 'data.csv';
    if (requestParams.filename.substring(requestParams.filename.length - 4) !== '.csv') {
      requestParams.filename = requestParams.filename + '.csv';
    }

    var searchParams = {
      size: 9999999
    };
    if (requestParams.query && requestParams.query.length > 0) {
      searchParams.q = requestParams.query;
    }

    OutpatientVisit.search(searchParams, function (err, data) {
      var callback = function (err, csv) {
        if (err) {
          throw err;
        }
        var tmpFilename = getFilename(requestParams.filename, req.user);
        var filepath = path.normalize(os.tmpdir() + '/' + tmpFilename);
        fs.writeFile(filepath, csv, function (err) {
          if (err) {
            return console.log(err);
          }

          download(res, filepath, requestParams.filename);
        });
      };
      var recs = dataFormatter.format(data, requestParams.format);
      console.log('requestParams.delimiter: ' + requestParams.delimiter);
      if (recs.length > 0) {

        Form.search({q: 'name:site'}, function (formErr, formData) {

          if (formErr) {
            throw formErr;
          } else if (formData.length === 0) {
            throw new Error('No form config found!');
          }

          var formFields = formData[0].doc.fields;
          var fields = flatten(config.template);
          var fieldIds = getFields(fields, formFields, requestParams.format);
          var fieldNames = fieldIds;

          var converterParams = {
            data: recs,
            fields: fieldIds,
            fieldNames: fieldNames,
            del: requestParams.delimiter
          };

          converter(converterParams, callback);
        });
      } else {
        callback(null, '');
      }

    });
  });
  return app;
};
