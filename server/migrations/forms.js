'use strict';

module.exports = [
  {
    // everything enabled for demo
    name: 'demo',
    fields: [
      {
        name: 'visitDate',
        enabled: true
      },
      {
        name: 'symptomOnsetDate',
        enabled: true
      },

      // this is always collected automatically when the form is submitted (because why not?), but only displayed
      // if this field is enabled
      {
        name: 'submissionDate',
        enabled: true
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
        enabled: true
      },

      // geographic fields, these are collected via medical facility, so users don't have to input them separately
      {
        name: 'medicalFacility.location.district',
        enabled: true,
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

      // more geographic fields as needed

      // patient info
      {
        name: 'patient.id',
        enabled: true
      },
      {
        name: 'patient.name',
        enabled: true
      },
      {
        name: 'patient.sex',
        enabled: true
      },

      {
        name: 'patient.dateOfBirth',
        enabled: true
      },
      {
        name: 'patient.age',
        enabled: true
      },

      // pregnancy status
      {
        name: 'patient.pregnant.is',
        enabled: true
      },
      {
        name: 'patient.pregnant.trimester',
        enabled: true
      },

      // patient contact info
      {
        name: 'patient.phone',
        enabled: true
      },
      {
        name: 'patient.address',
        enabled: true
      },

      // patient vitals
      {
        name: 'patient.temperature',
        enabled: true
      },
      {
        name: 'patient.pulse',
        enabled: true
      },
      {
        name: 'patient.weight',
        enabled: true
      },

      {
        name: 'patient.preExistingConditions',
        enabled: true,
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
        enabled: true
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
        values: require('./symptom.json')
      },
      {
        name: 'symptoms.other',
        enabled: true
      },

      {
        name: 'diagnoses',
        enabled: true,
        values: require('./diagnosis.json')
      },
      {
        name: 'diagnoses.other',
        enabled: true
      },

      {
        name: 'disposition',
        enabled: true,
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
        enabled: true
      }
    ]
  }
];
