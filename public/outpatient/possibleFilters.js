'use strict';

var angular = require('angular');

// All possible filters for a data set
module.exports = function (gettextCatalog) {
  return {
    // indexed by filterID for ease of toggling on/off, e.g. forms that don't track antiviral use can disable
    // the antiviral filter
    // NOTE: this means the filterID (and key in this map) MUST match the name of the form field
    visitDate: {
      filterID: 'visitDate',
      type: 'date-range',
      field: 'visitDate',
      name: gettextCatalog.getString('Visit date')
    },
    submissionDate: {
      filterID: 'submissionDate',
      type: 'date-range',
      field: 'submissionDate',
      name: gettextCatalog.getString('Form submission date')
    },
    facility: {
      filterID: 'facility',
      type: 'multi-select',
      field: 'medicalFacility.name',
      name: gettextCatalog.getString('Facility')
    },
    patientAge: {
      filterID: 'patientAge',
      type: 'numeric-range',
      field: 'patient.age',
      name: gettextCatalog.getString('Age')
    },
    patientSex: {
      filterID: 'patientSex',
      type: 'sex',
      field: 'patient.sex',
      name: gettextCatalog.getString('Sex')
    },
    symptoms: {
      filterID: 'symptoms',
      type: 'multi-select',
      field: 'symptoms.name',
      name: gettextCatalog.getString('Symptom')
    },
    diagnoses: {
      filterID: 'diagnoses',
      type: 'multi-select',
      field: 'diagnoses.name',
      name: gettextCatalog.getString('Diagnoses')
    },
    antiviralName: {
      filterID: 'antiviralName',
      type: 'text',
      field: 'antiviral.name',
      name: gettextCatalog.getString('Antiviral')
    }
  };
};

angular.module(require('../scripts/modules').services.name).factory('possibleFilters', module.exports);

