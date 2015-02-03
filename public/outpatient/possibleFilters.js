'use strict';

var angular = require('angular');
var services = require('../scripts/modules').services;

angular.module(services.name).factory('possibleFilters', /*@ngInject*/ function (gettextCatalog) {
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
      name: gettextCatalog.getString('Visit date')
    },
    {
      filterID: 'symptomOnsetDate',
      type: 'date-range',
      field: 'symptomOnsetDate',
      name: gettextCatalog.getString('Symptom onset date')
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
      name: gettextCatalog.getString('Facility'),
      aggregation: {
        terms: {
          field: 'medicalFacility.name.raw',
          order: { '_term': 'asc' }
        }
      }
    },
    {
      filterID: 'medicalFacilityGroup',
      type: 'group',
      field: 'medicalFacility.name',
      name: gettextCatalog.getString('Facility Group'),
      aggregationField: 'medicalFacility.name.raw',
      aggregation: {
        filters : {
          // Buckets/filters will be added here...
        }
      }
    },
    {
      // the same can be done for any geographic region stored on medicalFacility, e.g. county, state, country, etc.
      filterID: 'medicalFacility.location.district',
      type: 'multi-select',
      field: 'medicalFacility.location.district',
      name: gettextCatalog.getString('District'),
      aggregation: {
        terms: {
          field: 'medicalFacility.location.district.raw',
          order: { '_term': 'asc' }
        }
      }
    },
    {
      // the same can be done for any geographic region stored on medicalFacility, e.g. county, state, country, etc.
      filterID: 'medicalFacility.location.country',
      type: 'multi-select',
      field: 'medicalFacility.location.country',
      name: gettextCatalog.getString('Country'),
      aggregation: {
        terms: {
          field: 'medicalFacility.location.country.raw',
          order: { '_term': 'asc' }
        }
      }
    },
    {
      filterID: 'patient.id',
      type: 'text',
      field: 'patient.id',
      name: gettextCatalog.getString('Id'),
      aggregation: {
        terms: {
          field: 'patient.id',
          order: { '_term': 'asc' }
        }
      }
    },
    // TODO: Remove patient.age filter once age group aggregation works on cross tab
    {
      filterID: 'patient.age',
      type: 'age-range',
      field: 'patient.age.years',
      name: gettextCatalog.getString('Age'),
      aggregation: {
        range: { // age is actually an age group, b/c that's almost always what you actually want
          field: 'patient.age.years',
          ranges: [
            {key: '[0 TO 1}', to: 1},
            {key: '[1 TO 5}', from: 1, to: 5},
            {key: '[5 TO 12}', from: 5, to: 12},
            {key: '[12 TO 18}', from: 12, to: 18},
            {key: '[18 TO 45}', from: 18, to: 45},
            {key: '[45 TO 65}', from: 45, to: 65},
            {key: '[65 TO *]', from: 65}
          ]
        }
      }
    },
    {
      filterID: 'patient.ageGroup',
      type: 'group',
      field: 'patient.age.years',
      name: gettextCatalog.getString('Age Group'),
      aggregation: {
        range: { // age is actually an age group, b/c that's almost always what you actually want
          field: 'patient.age.years',
          keyed: true
        }
      }
    },
    {
      filterID: 'patient.sex',
      type: 'sex',
      field: 'patient.sex',
      name: gettextCatalog.getString('Sex'),
      aggregation: {
        terms: {
          field: 'patient.sex',
          order: { '_term': 'asc' }
        }
      }
    },
    {
      filterID: 'patient.pregnant.is',
      type: 'check-box',
      field: 'patient.pregnant.is',
      name: gettextCatalog.getString('Pregnant'),
      aggregation: {
        terms: {
          field: 'patient.pregnant.is',
          order: { '_term': 'asc' }
        }
      }
    },
    {
      filterID: 'patient.preExistingConditions',
      type: 'multi-select',
      field: 'patient.preExistingConditions.name',
      name: gettextCatalog.getString('Pre-existing conditions'),
      aggregation: {
        terms: {
          field: 'patient.preExistingConditions.name.raw',
          order: { '_term': 'asc' }
        }
      }
    },
    {
      filterID: 'symptoms',
      type: 'multi-select',
      field: 'symptoms.name',
      name: gettextCatalog.getString('Symptom'),
      aggregation: {
        nested: {
          path: 'symptoms'
        },
        aggs: {
          _name: { //double check that using an underscore is kosher
            terms: {
              field: 'symptoms.name.raw',
              order: { '_term': 'asc' }
            },
            aggs: {
              count: {
                sum: {
                  field: 'symptoms.count'
                }
              }
            }
          }
        }
      }
    },
    {
      filterID: 'symptomsGroup',
      type: 'group',
      field: 'symptoms.name',
      name: gettextCatalog.getString('Symptom Group'),
      aggregationField: 'symptoms.name.raw',
      aggregation: {
        nested: {
          path: 'symptoms'
        },
        aggs: {
          _name: { //double check that using an underscore is kosher
            filters : {
              // Buckets/filters will be added here...
            },
            aggs: {
              count: {
                sum: {
                  field: 'symptoms.count'
                }
              }
            }
          }
        }
      }
    },
    {
      filterID: 'syndromes',
      type: 'multi-select',
      field: 'syndromes.name',
      name: gettextCatalog.getString('Syndromes'),
      aggregation: {
        nested: {
          path: 'syndromes'
        },
        aggs: {
          _name: { //double check that using an underscore is kosher
            terms: {
              field: 'syndromes.name.raw',
              order: { '_term': 'asc' }
            },
            aggs: {
              count: {
                sum: {
                  field: 'syndromes.count'
                }
              }
            }
          }
        }
      }
    },
    {
      filterID: 'diagnoses',
      type: 'multi-select',
      field: 'diagnoses.name',
      name: gettextCatalog.getString('Diagnoses'),
      aggregation: {
        nested: {
          path: 'diagnoses'
        },
        aggs: {
          _name: { //double check that using an underscore is kosher
            terms: {
              field: 'diagnoses.name.raw',
              order: { '_term': 'asc' }
            },
            aggs: {
              count: {
                sum: {
                  field: 'diagnoses.count'
                }
              }
            }
          }
        }
      }
    },
    {
      filterID: 'diagnosesGroup',
      type: 'group',
      field: 'diagnoses.name',
      name: gettextCatalog.getString('Diagnoses Group'),
      aggregationField: 'diagnoses.name.raw',
      aggregation: {
        nested: {
          path: 'diagnoses'
        },
        aggs: {
          _name: { //double check that using an underscore is kosher
            filters : {
              // Buckets/filters will be added here...
            },
            aggs: {
              count: {
                sum: {
                  field: 'diagnoses.count'
                }
              }
            }
          }
        }
      }
    },
    {
      filterID: 'specimen.id',
      type: 'multi-select',
      field: 'specimen.id',
      name: gettextCatalog.getString('Specimen'),
      aggregation: {
        terms: {
          field: 'specimen.id',
          order: { '_term': 'asc' }
        }
      }
    },
    {
      filterID: 'antiviral.name',
      type: 'multi-select',
      field: 'antiviral.name',
      name: gettextCatalog.getString('Antiviral'),
      aggregation: {
        terms: {
          field: 'antiviral.name',
          order: { '_term': 'asc' }
        }
      }
    },
    {
      filterID: 'visitType',
      type: 'multi-select',
      field: 'visitType.name',
      name: gettextCatalog.getString('VisitType'),
      aggregation: {
        terms: {
          field: 'visitType.name',
          order: { '_term': 'asc' }
        }
      }
    },
    {
      filterID: 'disposition',
      type: 'multi-select',
      field: 'disposition.name',
      name: gettextCatalog.getString('Disposition'),
      aggregation: {
        terms: {
          field: 'disposition.name',
          order: { '_term': 'asc' }
        }
      }
    }
  ];

  var possibles = possibleFilters.reduce(function (filters, filter) {
    filters[filter.filterID] = angular.copy(filter);
    return filters;
  }, {});
//TODO, make every reference receive an object ID:OBJ
  var pivotArray = [];
  angular.forEach(possibleFilters, function (value, key) {
    pivotArray.push({value: value.filterID, label: value.name});
  });

  return {
    possibleFilters: possibles,
    pivotable: pivotArray
  };
});
