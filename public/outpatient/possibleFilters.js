'use strict';

var angular = require('angular');
var services = require('../scripts/modules').services;

angular.module(services.name).factory('possibleFilters', /*@ngInject*/ function () {
//TODO move type & field? to forms.js
// All possible filters for a data set
  var possibleFilters = [
    // indexed by filterID for ease of toggling on/off, e.g. forms that don't track antiviral use can disable
    // the antiviral filter
    // NOTE: this means the filterID (and key in this map) MUST match the name of the form field
    //skipping: submission_date, total_sites, total_reporting, notes
    //skipping: patient_id,name,dateOfBirth,weight,temp,pulse
    {
      filterID: 'visitDate',
      type: 'date-range',
      field: 'visitDate',
      name: 'visitDate'
    },
    {
      filterID: 'symptomOnsetDate',
      type: 'date-range',
      field: 'symptomOnsetDate',
      name: 'symptomOnsetDate'
    },
    {
      filterID: 'submissionDate',
      type: 'date-range',
      field: 'submissionDate',
      name: 'submissionDate'
    },
    {
      filterID: 'medicalFacility',
      type: 'multi-select',
      field: 'medicalFacility.name',
      name: 'medicalFacility'
    },
    {
      filterID: 'medicalFacilityGroup',
      type: 'group',
      field: 'medicalFacility.name',
      name: 'medicalFacilityGroup'
    },
    {
      // the same can be done for any geographic region stored on medicalFacility, e.g. county, state, country, etc.
      filterID: 'medicalFacility.location.district',
      type: 'multi-select',
      field: 'medicalFacility.location.district',
      name: 'medicalFacility.location.district'
    },
    {
      // the same can be done for any geographic region stored on medicalFacility, e.g. county, state, country, etc.
      filterID: 'medicalFacility.location.country',
      type: 'multi-select',
      field: 'medicalFacility.location.country',
      name: 'medicalFacility.location.country'
    },
    {
      filterID: 'patient.id',
      type: 'text',
      field: 'patient.id',
      name: 'patient.id'
    },
    {
      filterID: 'patient.age',
      type: 'numeric-range',
      field: 'patient.age.years',
      name: 'patient.age'
    },
    {
      filterID: 'patient.ageGroup',
      type: 'group',
      field: 'patient.age.years',
      name: 'patient.ageGroup',
      sortBy: 'from' // sort possible values by this property
    },
    {
      filterID: 'patient.sex',
      type: 'multi-select',//'sex',
      field: 'patient.sex',
      name: 'patient.sex'
    },
    {
      filterID: 'patient.pregnant.is',
      type: 'check-box',
      field: 'patient.pregnant.is',
      name: 'patient.pregnant.is'
    },
    {
      filterID: 'patient.preExistingConditions',
      type: 'multi-select',
      field: 'patient.preExistingConditions.name',
      name: 'patient.preExistingConditions'
    },
    {
      filterID: 'symptoms',
      type: 'multi-select',
      field: 'symptoms.name',
      name: 'symptoms'
    },
    {
      filterID: 'symptomsGroup',
      type: 'group',
      field: 'symptoms.name',
      name: 'symptomsGroup'
    },
    {
      filterID: 'syndromes',
      type: 'multi-select',
      field: 'syndromes.name',
      name: 'syndromes'
    },
    {
      filterID: 'diagnoses',
      type: 'multi-select',
      field: 'diagnoses.name',
      name: 'diagnoses'
    },
    {
      filterID: 'diagnosesGroup',
      type: 'group',
      field: 'diagnoses.name',
      name: 'diagnosesGroup'
    },
    {
      filterID: 'specimen.id',
      type: 'multi-select',
      field: 'specimen.id',
      name: 'specimen.id'
    },
    {
      filterID: 'antiviral.name',
      type: 'multi-select',
      field: 'antiviral.name',
      name: 'antiviral.name'
    },
    {
      filterID: 'visitType',
      type: 'multi-select',
      field: 'visitType.name',
      name: 'visitType'
    },
    {
      filterID: 'disposition',
      type: 'multi-select',
      field: 'disposition.name',
      name: 'disposition'
    }
  ];

  var possibles = possibleFilters.reduce(function (filters, filter) {
    filters[filter.filterID] = angular.copy(filter);
    return filters;
  }, {});

  var getPossibleFiltersFn = function(fields) {
    var reduced = fields.reduce(function (filters, field) {
      if (field.enabled) {
        var possibleFilter = possibles[field.name];
        if (possibleFilter) {
          filters[field.name] = angular.extend({values: field.values}, possibleFilter);
        }
      }
      return filters;
    }, {});
    return reduced;
  };

  var getAggregablesFn = function(fields) {
    var aggs = [];
    angular.forEach(fields, function (field) {
      if (field.enabled && field.aggregable) {
        aggs.push({value: field.name, label: field.name});
      }
    });
    return aggs;
  };

  return {
    possibleFilters: possibles,
    getPossibleFilters: getPossibleFiltersFn,
    getAggregables: getAggregablesFn
  };
});
