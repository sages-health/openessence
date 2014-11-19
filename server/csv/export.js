'use strict';

var express = require('express');
var OutpatientVisit = require('./../models/OutpatientVisit');
var converter = require('json2csv');
var path = require('path');
var fs = require('fs');
var os = require('os');
var crypto = require('crypto');

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
      console.log('requestParams.delimiter: '+ requestParams.delimiter);
      if (recs.length > 0) {
        var converterParams = {
          data: recs,
          fields: config.results[requestParams.format].fields,
          fieldNames: config.results[requestParams.format].fieldNames,
          del: requestParams.delimiter
        };
        converter(converterParams, callback);
      }
      else {
        callback(null, '');
      }

    });
  });
  return app;
};
