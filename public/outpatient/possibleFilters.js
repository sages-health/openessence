'use strict';

var angular = require('angular');

// All possible filters for a data set
// @ngInject
module.exports = function (gettextCatalog) {
  return [
    // indexed by filterID for ease of toggling on/off, e.g. forms that don't track antiviral use can disable
    // the antiviral filter
    // NOTE: this means the filterID (and key in this map) MUST match the name of the form field
    {
      filterID: 'visitDate',
      type: 'date-range',
      field: 'visitDate',
      name: gettextCatalog.getString('Visit date')
    },
    {
      filterID: 'submissionDate',
      type: 'date-range',
      field: 'submissionDate',
      name: gettextCatalog.getString('Form submission date')
    },
    {
      filterID: 'medicalFacility',
      type: 'multi-select',
      field: 'medicalFacility.name',
      name: gettextCatalog.getString('Facility')
    },
    {
      // the same can be done for any geographic region stored on medicalFacility, e.g. county, state, country, etc.
      filterID: 'medicalFacility.location.district',
      type: 'multi-select',
      field: 'medicalFacility.location.district',
      name: gettextCatalog.getString('District')
    },
    {
      // the same can be done for any geographic region stored on medicalFacility, e.g. county, state, country, etc.
      filterID: 'medicalFacility.location.country',
      type: 'multi-select',
      field: 'medicalFacility.location.country',
      name: gettextCatalog.getString('Country')
    },
    {
      filterID: 'patient.age',
      type: 'numeric-range',
      field: 'patient.age.years',
      name: gettextCatalog.getString('Age')
    },
    {
      filterID: 'patient.sex',
      type: 'sex',
      field: 'patient.sex',
      name: gettextCatalog.getString('Sex')
    },
    {
      filterID: 'symptoms',
      type: 'multi-select',
      field: 'symptoms.name',
      name: gettextCatalog.getString('Symptom')
    },
    {
      filterID: 'diagnoses',
      type: 'multi-select',
      field: 'diagnoses.name',
      name: gettextCatalog.getString('Diagnoses')
    },
    {
      filterID: 'antiviral.name',
      type: 'text',
      field: 'antiviral.name',
      name: gettextCatalog.getString('Antiviral')
    }
  ].reduce(function (filters, filter) {
      filters[filter.filterID] = filter;
      return filters;
    }, {});
};

angular.module(require('../scripts/modules').services.name).factory('possibleFilters', module.exports);

