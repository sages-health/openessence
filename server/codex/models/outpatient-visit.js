'use strict';

var util = require('util');
var Model = require('../model');

function OutpatientVisit () {
  Model.call(this, {
    index: 'outpatient',
    type: 'visit',
    sql: 'SELECT * FROM outpatient_visit',
    mapping: {
      reportDate: {
        type: 'date'
      },

      // AKA presenting problem, Reason for Encounter, Reason for Presenting, etc. Free text
      chiefComplaint: {
        type: 'string'
      },

      // Array of well-known symptoms that the patient presented with. Might be populated by parsing chiefComplaint,
      // or might be used instead of chiefComplaint. Used for syndromic surveillance.
      symptoms: {
        type: 'string'
      },

      // Array of well-known diagnoses. Usually used with symptoms.
      diagnoses: {
        type: 'string'
      },

      // Array of diseases that warrant reporting. Typically used instead of symptoms.
      notifiableDiseases: {
        type: 'string'
      },

      patient: {
        properties: {
          _id: {
            type: 'integer',
            index: 'not_analyzed'
          },
          age: {
            type: 'double' // we don't need that much precision, but we do want to support fractional ages, e.g. 0.5
          },
          sex: {
            type: 'string',
            analyzer: 'sex'
          },
          weight: {
            // Note that we do not store units, e.g. lb or kg. It's up to the application to make sure every entry
            // uses the same units.
            type: 'double'
          },
          temperature: {
            type: 'double'
          },
          pulse: {
            type: 'double'
          },
          bloodPressure: {
            properties: {
              diastolic: {
                type: 'double'
              },
              systolic: {
                type: 'double'
              }
            }
          }
        }
      },

      // AKA the clinic, hospital, military treatment center, etc. where the patient was processed.
      // Why medicalFacility? Because that's what http://en.wikipedia.org/wiki/Medical_facility says.
      medicalFacility: {
        properties: {

          // The name of this facility
          name: {
            type: 'string'
          },

          // The administrative subdivision of this facility. Could be state, county, school district, etc.
          district: {
            type: 'string' // we only have district name right now
          }
        }
      },

      audit: {
        properties: {
          // when the record was added to the system
          creation: {
            properties: {
              // Date record was created
              date: {
                type: 'date'
              },

              // User that created this record
              user: {
                type: 'string' // no need to store whole user object here
              }
            }
          },

          // Array of modifications to this record
          modifications: {
            properties: {
              // date of modification
              date: {
                type: 'date'
              },

              // user ID that did the modifying
              user: {
                type: 'string' // no need to store whole user object here
              }

              // could also store _source to track changes, but that's a lot of extra storage
            }
          }
        }
      }
    },
    indexSettings: {
      analysis: {
        analyzer: {
          // allow searching on sex=female or sex=f
          sex: {
            tokenizer: 'whitespace',
            filter: ['lowercase', 'sex']
          }
        },
        filter: {
          sex: {
            type: 'synonym',
            synonyms: [
              'm => male',
              'f => female'
            ]
          }
        }
      }
    }
  });
}

util.inherits(OutpatientVisit, Model);

module.exports = OutpatientVisit;
