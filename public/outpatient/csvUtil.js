'use strict';

var angular = require('angular');
var services = require('../scripts/modules').services;
var csvExportConfig = require('csv-export');

angular.module(services.name).factory('csvUtil', function () {

  // Get or set record's field value
  var fieldValue = function fieldValue (record, field, newValue) {
    if (typeof field === 'string') {
      return fieldValue(record, field.split('.'), newValue);
    } else if(field.length == 3 && record[field.join('.')]){
      record[field[0]] = {};
      record[field[0]][field[1]] = {};
      record[field[0]][field[1]][field[2]] = record[field.join('.')];

      delete record[field.join('.')];
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

  /* Below implementation found here: 
   * http://stackoverflow.com/questions/28058519/javascript-convert-dot-delimited-strings-to-nested-object-value
   * 
   * Modified to check for existence of and create missing properties
   * 
   */
  var assignProperty = function assignProperty(obj, path, value) {
    var props = path.split(".")
        , i = 0
        , prop;

    for(; i < props.length - 1; i++) {
        prop = props[i];

        if(obj[prop] === undefined){
          obj[prop] = {};
        }

        obj = obj[prop];
    }

    obj[props[i]] = value;

  };

  return {
    toRecord: function (csvRec) {
      var rec = angular.copy(csvRec);
      if (rec.visitDate) {
        // Let's not delete rec.id, it may help user to locate not imported records.
        rec.importId = rec.id;
        delete rec.id;
        var checkedFields = [];
        // format data
        Object.keys(csvExportConfig.dataTypes).forEach(function (dataType) {
          csvExportConfig.dataTypes[dataType].fields.forEach(function (fld) {
            checkedFields.push(fld);
            var val = fieldValue(rec, fld);

            if (val) {
              val = (typeof val === 'string') ? val.trim() : val;
              if(rec.count && csvExportConfig.dataTypes.arrayOfObjects.fields.indexOf(fld) > -1){
                fieldValue(rec, fld, csvExportConfig.dataTypes[dataType].importFormat(val, rec.count));
              }
              else{
                fieldValue(rec, fld, csvExportConfig.dataTypes[dataType].importFormat(val));
              }
            }
            // if field does not have value and data type is array or array of object
            else if (dataType === 'array' || dataType === 'arrayOfObjects') {
              delete rec[fld];
            }
          });
        });

        Object.keys(rec).forEach(function (fld){
          if(checkedFields.indexOf(fld) < 0){
            assignProperty(rec, fld, rec[fld]);

            if(fld.indexOf('.') > -1){
              delete rec[fld];
            }
          }
        });

        return rec;
      }
    }
  };
});
