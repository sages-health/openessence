'use strict';

var angular = require('angular');
var services = require('../scripts/modules').services;
var csvExportConfig = require('csv-export');
var _ = require('lodash');
var moment = require('moment');
angular.module(services.name).factory('csvUtil', function () {

  // Get or set record's field value
  var fieldValue = function fieldValue(record, field, newValue) {
    if (typeof field === 'string') {
      return fieldValue(record, field.split('.'), newValue);
    } else if (field.length == 3 && record[field.join('.')]) {
      record[field[0]] = {};
      record[field[0]][field[1]] = {};
      record[field[0]][field[1]][field[2]] = record[field.join('.')];

      delete record[field.join('.')];
    }
    else if(field.length === 2 && newValue !== undefined){
      record[field[0]] = {};
      record[field[0]][field[1]] = newValue;
      
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

    for (; i < props.length - 1; i++) {
      prop = props[i];

      if (obj[prop] === undefined) {
        obj[prop] = {};
      }

      obj = obj[prop];
    }

    obj[props[i]] = value;

  };

  var parseAggregateField = function (val, newCount){
      var res = [];
      if (val && val.length > 0) {
        val.split(';').forEach(function (str) {
          var arr = str.split(':');
          if(newCount){
            arr[1] = newCount;
          }
          res.push({
            name: arr[0].replace(/'/g, '').trim(),
            count: parseInt(arr[1] !== undefined && arr[1] !== null ? arr[1] : 1)
          });
        });
      }
      return res;
  
  };

  return {
    toRecord: function (csvRec, form) {
      var rec = angular.copy(csvRec);
      if (rec.visitDate) {
        // Let's not delete rec.id, it may help user to locate not imported records.
        rec.importId = rec.id;
        delete rec.id;
        var checkedFields = [];


        _.forEach(rec, function(value, field) {
          var formField;
          for(var i = 0; i < form.fields.length; i++){
            if(field == form.fields[i].name)
              formField = form.fields[i];
          }
          
          var fieldName = field;

          if(formField !== undefined){
            if(formField.nested && formField.table.type !== 'agg'){
              fieldName = fieldName + '.name';
              fieldValue(rec, fieldName, rec[field]);
              delete rec[field];
            }

            if(formField.table.type === 'date'){
              rec[fieldName] = moment(rec[fieldName]).format('YYYY-MM-DDThh:mm:ss.SSS') + 'Z';
            }
            if(formField.table.type === 'age'){
              fieldValue(rec, field, parseInt(rec[fieldName]));
            }
            if(formField.table.type === 'agg'){
              delete rec[fieldName];  
              rec[fieldName] = parseAggregateField(value, rec.count); 
            }
          }
        });

        return rec;
      }
    }
  };

});
