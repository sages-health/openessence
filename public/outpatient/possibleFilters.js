'use strict';

var angular = require('angular');
var services = require('../scripts/modules').services;

angular.module(services.name).factory('possibleFilters', /*@ngInject*/ function ($filter) {
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
      name: 'op.VisitDate'
    },
    {
      filterID: 'symptomOnsetDate',
      type: 'date-range',
      field: 'symptomOnsetDate',
      name: 'op.SymptomOnsetDate'
    },
    {
      filterID: 'submissionDate',
      type: 'date-range',
      field: 'submissionDate',
      name: 'op.FormSubmissionDate'
    },
    {
      filterID: 'medicalFacility',
      type: 'multi-select',
      field: 'medicalFacility.name',
      name: 'op.Facility'
    },
    {
      filterID: 'medicalFacilityGroup',
      type: 'group',
      field: 'medicalFacility.name',
      name: 'op.FacilityGroup'
    },
    {
      // the same can be done for any geographic region stored on medicalFacility, e.g. county, state, country, etc.
      filterID: 'medicalFacility.location.district',
      type: 'multi-select',
      field: 'medicalFacility.location.district',
      name: 'op.District'
    },
    {
      filterID: 'medicalFacility.location.district.group',
      type: 'group',
      field: 'medicalFacility.location.district',
      name: 'op.MedicalFacilityLocationDistrictGroup'
    },
    {
      // the same can be done for any geographic region stored on medicalFacility, e.g. county, state, country, etc.
      filterID: 'medicalFacility.location.country',
      type: 'multi-select',
      field: 'medicalFacility.location.country',
      name: 'op.Country'
    },
    {
      filterID: 'patient.id',
      type: 'text',
      field: 'patient.id',
      name: 'op.PatientID'
    },
    {
      filterID: 'patient.age',
      type: 'numeric-range',
      field: 'patient.age.years',
      name: 'op.Age'
    },
    {
      filterID: 'patient.ageGroup',
      type: 'group',
      field: 'patient.age.years',
      name: 'op.AgeGroup',
      sortBy: 'from' // sort possible values by this property
    },
    {
      filterID: 'patient.sex',
      type: 'multi-select',//'sex',
      field: 'patient.sex',
      name: 'op.Sex'
    },
    {
      filterID: 'patient.pregnant.is',
      type: 'check-box',
      field: 'patient.pregnant.is',
      name: 'op.Pregnant'
    },
    {
      filterID: 'patient.preExistingConditions',
      type: 'multi-select',
      field: 'patient.preExistingConditions.name',
      name: 'op.PreExistingConditions'
    },
    {
      filterID: 'symptoms',
      type: 'multi-select',
      field: 'symptoms.name',
      name: 'op.Symptoms'
    },
    {
      filterID: 'symptomsGroup',
      type: 'group',
      field: 'symptoms.name',
      name: 'op.SymptomsGroup'
    },
    {
      filterID: 'syndromes',
      type: 'multi-select',
      field: 'syndromes.name',
      name: 'op.Syndromes'
    },
    {
      filterID: 'diagnoses',
      type: 'multi-select',
      field: 'diagnoses.name',
      name: 'op.Diagnoses'
    },
    {
      filterID: 'diagnosesGroup',
      type: 'group',
      field: 'diagnoses.name',
      name: 'op.DiagnosesGroup'
    },
    {
      filterID: 'specimen.id',
      type: 'multi-select',
      field: 'specimen.id',
      name: 'op.Specimen'
    },
    {
      filterID: 'antiviral.name',
      type: 'multi-select',
      field: 'antiviral.name',
      name: 'op.Antiviral'
    },
    {
      filterID: 'visitType',
      type: 'multi-select',
      field: 'visitType.name',
      name: 'op.VisitType'
    },
    {
      filterID: 'disposition',
      type: 'multi-select',
      field: 'disposition.name',
      name: 'op.Disposition'
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
        } else {
          //dynamic field
          filters[field.name] =  {
            filterID: field.name,
            type: field.type || 'text',
            field: field.field || field.name,
            name: $filter('i18next')(field.name),
            values: field.values
          };
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
        var display = possibles[field.name] ? possibles[field.name] : field;
        display = $filter('i18next')(display.name);
        aggs.push({value: field.name, label: display});
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
