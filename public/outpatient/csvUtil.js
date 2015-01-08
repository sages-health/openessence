'use strict';

var angular = require('angular');
var services = require('../scripts/modules').services;
var csvExportConfig = require('csv-export');

angular.module(services.name).factory('csvUtil', function () {

  // Get or set record's field value
  var fieldValue = function fieldValue (record, field, newValue) {
    if (typeof field === 'string') {
      return fieldValue(record, field.split('.'), newValue);
    } else if (field.length === 1 && newValue !== undefined) {
      record[field[0]] = newValue;
    } else if (field.length === 0) {
      return record;
    } else {
      if (record[field[0]]) {
        return fieldValue(record[field[0]], field.slice(1), newValue);
      }
      return undefined;
    }
  };

  return {
    toRecord: function (csvRec) {
      var rec = angular.copy(csvRec);
      if (rec.visitDate) {
        // Let's not delete rec.id, it may help user to locate not imported records.
        rec.importId = rec.id;
        delete rec.id;

        // format data
        Object.keys(csvExportConfig.dataTypes).forEach(function (dataType) {
          csvExportConfig.dataTypes[dataType].fields.forEach(function (fld) {
            var val = fieldValue(rec, fld);
            if (val) {
              val = (typeof val === 'string') ? val.trim() : val;
              fieldValue(rec, fld, csvExportConfig.dataTypes[dataType].importFormat(val));
            }
            // if field does not have value and data type is array or array of object
            else if (dataType === 'array' || dataType === 'arrayOfObjects') {
              delete rec[fld];
            }
          });
        });
        return rec;
      }
    }
  };
});
