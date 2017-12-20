'use strict';

module.exports = [
  {
    // everything enabled for demo
    name: 'Custom',
    fields: [
      {
        name: 'visitDate',
        aggregable: true,
        isFilter: true,
        enabled: true,
        // users cannot change the 'enabled' value of a locked field
        locked: true,
        localeName: 'op.VisitDate',

        //name -> filterID
        //name -> field
        //localeName -> name
        filter: {
          type: 'date-range',
        },
        //localeName -> title
        //name -> field

        table: {
          type: 'date'
        }
      },

      {
        // Name of the field should match how it's stored in document, otherwise it gets complicated to match up.
        // It's not `medicalFacility.name` because the user is selecting the entire medical facility, not just the name
        // (even though the name is what's displayed and queried on).
        name: 'medicalFacility',
        nested: true,
        enabled: false,
        aggregable: true,
        isFilter: false,
        groupName: 'medicalFacilityGroup',
        // can't do this with JSON
        values: require('./facilities.json'),
        locked: false,
        localeName: 'op.Facility',

        //name -> filterID
        //name -> field
        //localeName -> name
        filter: {
          enabled: true,
          type: 'multi-select'
        },
        //localeName -> title
        //name -> field

        table: {
          enabled: true,
          type: 'multi-select'
        }
      },

      // Allow user-supplied values for medical facility.
      // NOTE: "other" fields MUST be named "$base_field" + ".other". Otherwise we'd have no idea what model to append
      // the user submitted value to.
      //{
      //  name: 'medicalFacility.other',
      //  enabled: false
      //},

      {
        // medicalFacilities are grouped as medicalFacilityGroup for query purpose
        // Outpatient model does not have grouping fields, so this field will not be populated on data entry page
        // when this field is selected as a filter on workbench, it will expand query to medicalFacility
        name: 'medicalFacilityGroup',
        enabled: false,
        aggregable: true,
        isGroup: true,
        isFilter: false,
        possibleValuesFrom: 'medicalFacility',
        localeName: 'op.FacilityGroup',

        //name -> filterID
        //name -> field
        //localeName -> name
        filter: {
          enabled: false

        },
        //localeName -> title
        //name -> field

        table: {
          enabled: false

        }
      },

      // geographic fields, these are collected via medical facility, so users don't have to input them separately
      /*
          {
      filterID: 'medicalFacility.location.district.group',
      type: 'group',
      field: 'medicalFacility.location.district',
      name: 'op.MedicalFacilityLocationDistrictGroup'
    },
    */
      {
        name: 'medicalFacilityDistrict',
        enabled: false,
        groupName: 'medicalFacilityDistrictGroup',
        isFilter: false,
        values: Object.keys(require('./facilities.json').reduce(function (districts, facility) {
          // construct set of districts
          if (facility.location && facility.location.district) {
            var district = facility.location.district;
            districts[district] = true;
          }

          return districts;
        }, {}))
          .sort()
          .map(function (name) {
            return {
              name: name
            };
          }),
        locked: false,
        localeName: 'op.District',
        filter: {
          enabled: true,
          type: 'multi-select'
        },
        table: {
          enabled: true,
          type: 'multi-select'
        }
      },

      {
        name: 'medicalFacilityDistrictGroup',
        enabled: false,
        aggregable: true,
        isGroup: true,
        isFilter: false,
        possibleValuesFrom: 'medicalFacilityDistrict'
      },

      {
        name: 'patient.age.years',
        groupName: 'patient.ageGroup',
        enabled: false,
        aggregable: true,
        localeName: 'op.Age',
        locked: false,
        fieldType: 'age',
        isFilter: false,
        filter: {
          enabled: true,
          type: 'numeric-range'
        },
        table: {
          enabled: true,
          type: 'age',
          field: 'patient.age.years',
        }

      },

      {
        name: 'patient.ageGroup',
        enabled: false,
        aggregable: true,
        isGroup: true,
        field: 'patient.age.years',
        isFilter: false,
        values: [
          { name: 'Less than 1', value: '[0 TO 1}', from: 0, to: 1 },
          { name: '1 to 4', value: '[1 TO 5}', from: 1, to: 5 },
          { name: '5 to 11', value: '[5 TO 12}', from: 5, to: 12 },
          { name: '12 to 17', value: '[12 TO 18}', from: 12, to: 18 },
          { name: '18 to 44', value: '[18 TO 45}', from: 18, to: 45 },
          { name: '45 to 64', value: '[45 TO 65}', from: 45, to: 65 },
          { name: '65+', value: '[65 TO 999}', from: 65, to: 999 }
        ],
        localeName: 'op.AgeGroup',
        locked: false,
        filter: {
          enabled: false,
          type: 'type'
        },
        table: {
          enabled: true,
          type: 'group'
        }

      },

      {
        name: 'sex',
        enabled: false,
        aggregable: true,
        fieldType: 'FixedLengthList',
        isFilter: false,
        values: [
          { value: 'M', name: 'Male' },
          { value: 'F', name: 'Female' },
          { value: 'OTH', name: 'Other' },
          { value: 'UNK', name: 'Unknown' }
        ],
        locked: false,
        localeName: 'op.Sex',
        filter: {
          enabled: true,
          type: 'multi-select'
        },
        table: {
          enabled: true,
          type: 'multi-select'
        }
      },

      {
        name: 'symptoms',
        nested: true,
        enabled: true,
        aggregable: true,
        isFilter: false,
        values: require('./symptom.json'),
        locked: false,
        localeName: 'op.Symptoms',
        filter: {
          enabled: true,
          type: 'multi-select',
        },
        table: {
          enabled: true,
          type: 'agg',
        }
      },

      // this is always collected automatically when the form is submitted (because why not?), but only displayed
      // if this field is enabled
      {
        name: 'submissionDate',
        enabled: false,
        aggregable: true,
        isFilter: false,
        // users cannot change the 'enabled' value of a locked field
        locked: false,
        localeName: 'op.SubmissionDate',

        //name -> filterID
        //name -> field
        //localeName -> name
        filter: {
          type: 'date-range',
        },
        //localeName -> title
        //name -> field

        table: {
          type: 'date'
        }
      }
    ]
  },
  {
    // everything enabled for demo
    name: 'Demo',
    fields: [
      {
        name: 'visitDate',
        aggregable: true,
        enabled: true,
        // users cannot change the 'enabled' value of a locked field
        locked: true,
        isFilter: true,
        localeName: 'op.VisitDate',

        //name -> filterID
        //name -> field
        //localeName -> name
        filter: {
          type: 'date-range',
        },
        //localeName -> title
        //name -> field

        table: {
          type: 'date'
        }
      },

      {
        // Name of the field should match how it's stored in document, otherwise it gets complicated to match up.
        // It's not `medicalFacility.name` because the user is selecting the entire medical facility, not just the name
        // (even though the name is what's displayed and queried on).
        name: 'medicalFacility',
        nested: true,
        enabled: true,
        aggregable: true,
        isFilter: false,
        groupName: 'medicalFacilityGroup',
        // can't do this with JSON
        values: require('./facilities.json'),
        locked: false,
        localeName: 'op.Facility',

        //name -> filterID
        //name -> field
        //localeName -> name
        filter: {
          enabled: true,
          type: 'multi-select'
        },
        //localeName -> title
        //name -> field

        table: {
          enabled: true,
          type: 'multi-select'
        }
      },

      // Allow user-supplied values for medical facility.
      // NOTE: "other" fields MUST be named "$base_field" + ".other". Otherwise we'd have no idea what model to append
      // the user submitted value to.
      //{
      //  name: 'medicalFacility.other',
      //  enabled: false
      //},

      {
        // medicalFacilities are grouped as medicalFacilityGroup for query purpose
        // Outpatient model does not have grouping fields, so this field will not be populated on data entry page
        // when this field is selected as a filter on workbench, it will expand query to medicalFacility
        name: 'medicalFacilityGroup',
        enabled: false,
        aggregable: true,
        isGroup: true,
        isFilter: false,
        possibleValuesFrom: 'medicalFacility',
        localeName: 'op.FacilityGroup',

        //name -> filterID
        //name -> field
        //localeName -> name
        filter: {
          enabled: false

        },
        //localeName -> title
        //name -> field

        table: {
          enabled: false

        }
      },

      // geographic fields, these are collected via medical facility, so users don't have to input them separately
      {
        name: 'medicalFacilityDistrict',
        enabled: true,
        nested:true,
        values: Object.keys(require('./facilities.json').reduce(function (districts, facility) {
          // construct set of districts
          if (facility.location && facility.location.district) {
            var district = facility.location.district;
            districts[district] = true;
          }

          return districts;
        }, {}))
          .sort()
          .map(function (name) {
            return {
              name: name
            };
          }),
        locked: false,
        isFilter: false,
        localeName: 'op.District',
        fieldType: 'GIS',
        filter: {
          enabled: true,
          type: 'multi-select'
        },
        table: {
          enabled: true,
          type: 'multi-select'
        }

      },


      {
        name: 'patient.age.years',
        groupName: 'patient.ageGroup',
        enabled: true,
        aggregable: true,
        localeName: 'op.Age',
        locked: false,
        fieldType: 'age',
        isFilter: false,
        filter: {
          enabled: true,
          type: 'numeric-range'
        },
        table: {
          enabled: true,
          type: 'age',
          field: 'patient.age.years',
        }

      },

      {
        name: 'patient.ageGroup',
        enabled: false,
        aggregable: true,
        isGroup: true,
        isFilter: false,
        field: 'patient.age.years',
        values: [
          { name: 'Less than 1', value: '[0 TO 1}', from: 0, to: 1 },
          { name: '1 to 4', value: '[1 TO 5}', from: 1, to: 5 },
          { name: '5 to 11', value: '[5 TO 12}', from: 5, to: 12 },
          { name: '12 to 17', value: '[12 TO 18}', from: 12, to: 18 },
          { name: '18 to 44', value: '[18 TO 45}', from: 18, to: 45 },
          { name: '45 to 64', value: '[45 TO 65}', from: 45, to: 65 },
          { name: '65+', value: '[65 TO 999}', from: 65, to: 999 }
        ],
        localeName: 'op.AgeGroup',
        locked: false,
        filter: {
          enabled: false,
          type: 'type'
        },
        table: {
          enabled: true,
          type: 'group'
        }

      },

      {
        name: 'sex',
        enabled: true,
        aggregable: true,
        fieldType: 'FixedLengthList',
        isFilter: false,
        values: [
          { value: 'M', name: 'Male' },
          { value: 'F', name: 'Female' },
          { value: 'OTH', name: 'Other' },
          { value: 'UNK', name: 'Unknown' }
        ],
        locked: false,
        localeName: 'op.Sex',
        filter: {
          enabled: true,
          type: 'multi-select'
        },
        table: {
          enabled: true,
          type: 'multi-select'
        }
      },

      {
        name: 'symptoms',
        nested: true,
        enabled: true,
        aggregable: true,
        isFilter: false,
        values: require('./symptom.json'),
        locked: false,
        localeName: 'op.Symptoms',
        filter: {
          enabled: true,
          type: 'multi-select',
        },
        table: {
          enabled: true,
          type: 'agg',
        }
      },

      // this is always collected automatically when the form is submitted (because why not?), but only displayed
      // if this field is enabled
      {
        name: 'submissionDate',
        enabled: false,
        aggregable: true,
        isFilter: false,
        // users cannot change the 'enabled' value of a locked field
        locked: false,
        localeName: 'op.SubmissionDate',

        //name -> filterID
        //name -> field
        //localeName -> name
        filter: {
          type: 'date-range',
        },
        //localeName -> title
        //name -> field

        table: {
          type: 'date'
        }
      }
    ]
  }
];
