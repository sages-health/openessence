'use strict';

var angular = require('angular');
var services = require('../scripts/modules').services;

angular.module(services.name).factory('possibleFilters', /*@ngInject*/ function () {
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
      name: 'op.VisitDate',
      aggregation: {
        date_histogram: {
          field: 'visitDate',
          interval: 'day',
          format : 'yyyy-MM-dd'
        }
      }
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
      name: 'op.Facility',
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
      name: 'op.FacilityGroup',
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
      name: 'op.District',
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
      name: 'op.Country',
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
      name: 'op.Id',
      aggregation: {
        terms: {
          field: 'patient.id',
          order: { '_term': 'asc' }
        }
      }
    },
    {
      filterID: 'patient.age',
      type: 'numeric-range',
      field: 'patient.age.years',
      name: 'op.Age',
      aggregation: {
        terms: {
          field: 'patient.age.years',
          order: { '_term': 'asc' }
        }
      }

    },
    {
      filterID: 'patient.ageGroup',
      type: 'group',
      field: 'patient.age.years',
      name: 'op.AgeGroup',
      sortBy: 'from', // sort possible values by this property
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
      name: 'op.Sex',
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
      name: 'op.Pregnant',
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
      name: 'op.PreExistingConditions',
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
      name: 'op.Symptom',
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
      name: 'op.SymptomGroup',
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
      name: 'op.Syndromes',
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
      name: 'op.Diagnoses',
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
      name: 'op.DiagnosesGroup',
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
      name: 'op.Specimen',
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
      name: 'op.Antiviral',
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
      name: 'op.VisitType',
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
      name: 'op.Disposition',
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
