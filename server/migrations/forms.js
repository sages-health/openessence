'use strict';

module.exports = [
  {
    // everything enabled for demo
    name: 'Custom',
    fields: [
      {
        name: 'visitDate',
        enabled: false
      },
      {
        name: 'symptomOnsetDate',
        enabled: false
      },

      // this is always collected automatically when the form is submitted (because why not?), but only displayed
      // if this field is enabled
      {
        name: 'submissionDate',
        enabled: false
      },

      {
        // Name of the field should match how it's stored in document, otherwise it gets complicated to match up.
        // It's not `medicalFacility.name` because the user is selecting the entire medical facility, not just the name
        // (even though the name is what's displayed and queried on).
        name: 'medicalFacility',
        enabled: false,
        // can't do this with JSON
        values: require('./facilities.json')
      },

      // Allow user-supplied values for medical facility.
      // NOTE: "other" fields MUST be named "$base_field" + ".other". Otherwise we'd have no idea what model to append
      // the user submitted value to.
      {
        name: 'medicalFacility.other',
        enabled: false
      },

      // geographic fields, these are collected via medical facility, so users don't have to input them separately
      {
        name: 'medicalFacility.location.district',
        enabled: false,
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
          })
      },

      {
        name: 'medicalFacility.sites.total',
        enabled: false
      },

      {
        name: 'medicalFacility.sites.reporting',
        enabled: false
      },

      // patient info
      {
        name: 'patient.id',
        enabled: false
      },
      {
        name: 'patient.name',
        enabled: false
      },
      {
        name: 'patient.dateOfBirth',
        enabled: false
      },
      {
        name: 'patient.age',
        enabled: false
      },
      {
        name: 'patient.sex',
        enabled: false
      },

      // patient contact info
      {
        name: 'patient.phone',
        enabled: false
      },
      {
        name: 'patient.address',
        enabled: false
      },

      // patient vitals
      {
        name: 'patient.weight',
        enabled: false
      },
      {
        name: 'patient.temperature',
        enabled: false
      },
      {
        name: 'patient.pulse',
        enabled: false
      },

      // pregnancy status
      {
        name: 'patient.pregnant.is',
        enabled: false
      },
      {
        name: 'patient.pregnant.trimester',
        enabled: false
      },

      {
        name: 'patient.preExistingConditions',
        enabled: false,
        values: [
          'Chronic cardiac disease',
          'Asthma',
          'Chronic respiratory disease',
          'Chronic liver disease',
          'Diabetes',
          'Chronic neurological disease',
          'Chronic renal disease',
          'Chronic haematological disease',
          'Immune compromised',
          'Unknown' // Users don't actually comprehend 4-valued logic, but it makes them happy to see "Unknown"
        ].map(function (c) {
            return {
              name: c
            };
          })
      },
      {
        name: 'patient.preExistingConditions.other',
        enabled: false
      },

      {
        name: 'symptoms',
        enabled: false,
        values: require('./symptom.json')
      },
      {
        name: 'symptoms.other',
        enabled: false
      },
      {
        name: 'syndromes',
        enabled: false,
        values: require('./syndrome.json')
      },
      {
        name: 'syndromes.other',
        enabled: false
      },
      {
        name: 'diagnoses',
        enabled: false,
        values: require('./diagnosis.json')
      },
      {
        name: 'diagnoses.other',
        enabled: false
      },

      // specimen collection, e.g. for flu culturing
      {
        name: 'specimen.collectionDate',
        enabled: false
      },
      {
        name: 'specimen.id',
        enabled: false
      },

      // antiviral info
      {
        name: 'antiviral.exposure',
        enabled: false
      },
      {
        name: 'antiviral.name',
        enabled: false
      },
      {
        name: 'antiviral.source',
        enabled: false
      },

      {
        name: 'visitType',
        // we have this field in case anyone wants it, but doing this right means totally changing the form,
        // e.g. a "Well Baby" visit makes the rest of the form nonsensical
        enabled: false,
        values: require('./visit-type.json')
      },
      {
        name: 'disposition',
        enabled: false,
        values: require('./disposition.json')
      },
      {
        name: 'notes',
        enabled: false
      }
    ]
  },
  {
    // everything enabled for demo
    name: 'DemoData',
    fields: [
      {
        name: 'visitDate',
        enabled: true
      },
      {
        name: 'symptomOnsetDate',
        enabled: false
      },

      // this is always collected automatically when the form is submitted (because why not?), but only displayed
      // if this field is enabled
      {
        name: 'submissionDate',
        enabled: false
      },

      {
        // Name of the field should match how it's stored in document, otherwise it gets complicated to match up.
        // It's not `medicalFacility.name` because the user is selecting the entire medical facility, not just the name
        // (even though the name is what's displayed and queried on).
        name: 'medicalFacility',
        enabled: true,
        groupName: 'medicalFacilityGroup',
        // can't do this with JSON
        values: require('./facilities.json')
      },

      {
        // medicalFacilities are grouped as medicalFacilityGroup for query purpose
        // Outpatient model does not have grouping fields, so this field will not be populated on data entry page
        // when this field is selected as a filter on workbench, it will expand query to medicalFacility
        name: 'medicalFacilityGroup',
        enabled: true,
        isGroup: true,
        possibleValuesFrom: 'medicalFacility'
      },

      // Allow user-supplied values for medical facility.
      // NOTE: "other" fields MUST be named "$base_field" + ".other". Otherwise we'd have no idea what model to append
      // the user submitted value to.
      {
        name: 'medicalFacility.other',
        enabled: false
      },

      // geographic fields, these are collected via medical facility, so users don't have to input them separately
      {
        name: 'medicalFacility.location.district',
        enabled: false,
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
          })
      },

      {
        name: 'medicalFacility.sites.total',
        enabled: false
      },

      {
        name: 'medicalFacility.sites.reporting',
        enabled: false
      },

      // patient info
      {
        name: 'patient.id',
        enabled: false
      },
      {
        name: 'patient.name',
        enabled: false
      },
      {
        name: 'patient.sex',
        enabled: true
      },

      {
        name: 'patient.dateOfBirth',
        enabled: false
      },
      {
        name: 'patient.age',
        groupName: 'patient.ageGroup',
        enabled: true
      },
      {
        name: 'patient.ageGroup',
        enabled: true,
        isGroup: true,
        values: [
          {name: 'Less than 1', value: '[0 TO 1}', from: 0, to: 1},
          {name: '1 to 4', value: '[1 TO 5}', from: 1, to: 5},
          {name: '5 to 11', value: '[5 TO 12}', from: 5, to: 12},
          {name: '12 to 17', value: '[12 TO 18}', from: 12, to: 18},
          {name: '18 to 44', value: '[18 TO 45}', from: 18, to: 45},
          {name: '45 to 64', value: '[45 TO 65}', from: 45, to: 65},
          {name: '65+', value: '[65 TO 999}', from: 65, to: 999}
        ]
      },

      // pregnancy status
      {
        name: 'patient.pregnant.is',
        enabled: false
      },
      {
        name: 'patient.pregnant.trimester',
        enabled: false
      },

      // patient contact info
      {
        name: 'patient.phone',
        enabled: false
      },
      {
        name: 'patient.address',
        enabled: false
      },

      // patient vitals
      {
        name: 'patient.temperature',
        enabled: false
      },
      {
        name: 'patient.pulse',
        enabled: false
      },
      {
        name: 'patient.weight',
        enabled: false
      },

      {
        name: 'patient.preExistingConditions',
        enabled: false,
        values: [
          'Chronic cardiac disease',
          'Asthma',
          'Chronic respiratory disease',
          'Chronic liver disease',
          'Diabetes',
          'Chronic neurological disease',
          'Chronic renal disease',
          'Chronic haematological disease',
          'Immune compromised',
          'Unknown' // Users don't actually comprehend 4-valued logic, but it makes them happy to see "Unknown"
        ].map(function (c) {
            return {
              name: c
            };
          })
      },
      {
        name: 'patient.preExistingConditions.other',
        enabled: false
      },

      // specimen collection, e.g. for flu culturing
      {
        name: 'specimen.collectionDate',
        enabled: false
      },
      {
        name: 'specimen.id',
        enabled: false
      },

      // antiviral info
      {
        name: 'antiviral.exposure',
        enabled: false
      },
      {
        name: 'antiviral.name',
        enabled: false
      },
      {
        name: 'antiviral.source',
        enabled: false
      },

      {
        name: 'symptoms',
        enabled: true,
        groupName: 'symptomsGroup',
        values: [
          'Abdominal Pain',
          'Cold',
          'Coryza',
          'Cough',
          'Dehydration',
          'Diarrhea',
          'Fever',
          'Flushing',
          'Headache',
          'Joint Pain',
          'Muscle Pain',
          'Nosebleed',
          'Rash',
          'Shock',
          'Sore throat',
          'Stomach Pain',
          'Vomit'
        ].map(function (c) {
            return {
              name: c
            };
          })
      },
      {
        name: 'symptoms.other',
        enabled: true
      },

      {
        name: 'symptomsGroup',
        enabled: true,
        isGroup: true,
        possibleValuesFrom: 'symptoms'
      },

      {
        name: 'diagnoses',
        enabled: true,
        groupName: 'diagnosesGroup',
        values: [
          'Asthma',
          'Bronchitis',
          'Cholera',
          'Dengue',
          'Diarrhea/Vomiting',
          'Ear Infection',
          'HIV',
          'Malaria',
          'URTI'
        ].map(function (c) {
            return {
              name: c
            };
          })
      },
      {
        name: 'diagnoses.other',
        enabled: true
      },

      {
        name: 'diagnosesGroup',
        enabled: true,
        isGroup: true,
        possibleValuesFrom: 'diagnoses'
      },

      {
        name: 'disposition',
        enabled: false,
        values: require('./disposition.json')
      },
      {
        name: 'visitType',
        // we have this field in case anyone wants it, but doing this right means totally changing the form,
        // e.g. a "Well Baby" visit makes the rest of the form nonsensical
        enabled: false,
        values: require('./visit-type.json')
      },
      {
        name: 'notes',
        enabled: false
      }
    ]
  }
];
