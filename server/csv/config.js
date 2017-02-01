'use strict';

var moment = require('moment');

var template = {
  id: undefined,
  visitDate: undefined,
  symptomOnsetDate: undefined,
  submissionDate: undefined,
  medicalFacility: {
    name: undefined,
    location: {
      district: undefined,
      county: undefined
    },
    site: {
      total: undefined,
      reporting: undefined
    }
  },
  patient: {
    id: undefined,
    name: undefined,
    sex: undefined,
    dateOfBirth: undefined,
    age: {
      years: undefined
    },
    pregnant: {
      is: undefined,
      trimester: undefined
    },
    phone: undefined,
    address: undefined,
    temperature: undefined,
    pulse: undefined,
    weight: undefined,
    preExistingConditions: undefined
  },
  specimen: {
    collectionDate: undefined,
    id: undefined
  },
  antiviral: {
    exposure: undefined,
    name: undefined,
    source: undefined
  },
  symptoms: undefined,
  diagnoses: undefined,
  disposition: undefined,
  visitType: undefined,
  notes: undefined
};

// note: date format for export
var outputDateFormat = 'YYYY-MM-DD';
var inputDateFormat = 'YYYY-MM-DDThh:mm:ss.SSSZ';

var dataTypes = {
  date: {
    fields: ['visitDate', 'symptomOnsetDate', 'submissionDate', 'patient.dateOfBirth', 'specimen.collectionDate'],
    importFormat: function (val) {
      return moment(val, outputDateFormat).format('YYYY-MM-DDThh:mm:ss.SSS') + 'Z';
    }
  },
  integer: {
    fields: ['medicalFacility.site.total', 'medicalFacility.site.reported', 'patient.age.years'],
    importFormat: parseInt
  },
  double: {
    fields: ['patient.pregnant.trimester', 'patient.temperature', 'patient.pulse', 'patient.weight'],
    importFormat: parseFloat
  },
  boolean: {
    fields: ['patient.pregnant.is', 'antiviral.exposure'],
    importFormat: function (val) {
      return val === 'true';
    }
  },
  array: {
    fields: ['patient.preExistingConditions'],
    importFormat: function (val) {
      if (val && val.length > 0) {
        return JSON.parse(val);
      } else {
        return [];
      }
    }
  },
  arrayOfObjects: {
    fields: ['symptoms', 'diagnoses', 'disposition'],
    importFormat: function (val) {
      var res = [];
      if (val && val.length > 0) {
        val.split(';').forEach(function (str) {
          var arr = str.split(':');
          res.push({
            name: arr[0].replace(/'/g, '').trim(),
            count: parseInt(arr[1] !== undefined && arr[1] !== null ? arr[1] : 1)
          });
        });
      }
      return res;
    }
  }
};

module.exports = {
  template: template,
  dataTypes: dataTypes,
  inputDateFormat: inputDateFormat,
  outputDateFormat: outputDateFormat,
  exportFormats: ['vertical', 'flat', 'custom']
};
