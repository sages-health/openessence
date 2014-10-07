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
        name: 'facility',
        enabled: true,
        // can't do this with JSON
        values: require('./facilities.json')
      },

      // patient info
      {
        name: 'patientID',
        enabled: true
      },
      {
        name: 'patientName',
        enabled: true
      },
      {
        name: 'patientSex',
        enabled: true
      },
      {
        name: 'patientAge',
        enabled: true
      },
      {
        name: 'patientPhone',
        enabled: true
      },
      {
        name: 'patientAddress',
        enabled: true
      },

      // patient vitals
      {
        name: 'temperature',
        enabled: true
      },
      {
        name: 'pulse',
        enabled: true
      },
      {
        name: 'weight',
        enabled: true
      },
      {
        name: 'preExistingConditions',
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
          'Unknown'
        ].map(function (c) {
            return {
              name: c
            };
          })
      },

      // specimen collection, e.g. for flu culturing
      {
        name: 'specimenCollectionDate',
        enabled: true
      },
      {
        name: 'specimenID',
        enabled: true
      },

      // antiviral info
      {
        name: 'antiviralExposure',
        enabled: false
      },
      {
        name: 'antiviralName',
        enabled: false
      },
      {
        name: 'antiviralSource',
        enabled: false
      },

      {
        name: 'symptoms',
        enabled: true,
        values: require('./symptom.json')
      },
      {
        name: 'diagnoses',
        enabled: true,
        values: require('./diagnosis.json')
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
