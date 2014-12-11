module.exports = {
  template: {
    id: undefined,
    visitDate: undefined,
    symptomOnsetDate: undefined,
    submissionDate: undefined,
    medicalFacility: {
      name: undefined,
      location: {
        district: undefined,
        county: undefined
      },
      site: {
        total: undefined,
        reporting: undefined
      }
    },
    patient: {
      id: undefined,
      name: undefined,
      sex: undefined,
      dateOfBirth: undefined,
      age: {
        years: undefined
      },
      pregnant: {
        is: undefined,
        trimester: undefined
      },
      phone: undefined,
      address: undefined,
      temperature: undefined,
      pulse: undefined,
      weight: undefined,
      preExistingConditions: []
    },
    specimen: {
      collectionDate: undefined,
      id: undefined
    },
    antiviral: {
      exposure: undefined,
      name: undefined,
      source: undefined
    },
    symptoms: [],
    diagnoses: [],
    disposition: [],
    visitType: undefined,
    notes: undefined
  },
  results: {
    fields: {
      'id': 'ID',
      'visitDate': 'Visit Date',
      'symptomOnsetDate': 'Symptom Onset Date',
      'submissionDate': 'Submission Date',
      'medicalFacility.name': 'Facility Name',
      'medicalFacility.location.district': 'District',
      'medicalFacility.location.county': 'County',
      'medicalFacility.site.total': 'Total Sites',
      'medicalFacility.site.reported': 'Reporting Sites',
      'patient.id': 'Patient ID',
      'patient.name': 'Patient Name',
      'patient.sex': 'Sex',
      'patient.dateOfBirth': 'Date Of Birth',
      'patient.age.years': 'Age',
      'patient.pregnant.is': 'Is Pregnant',
      'patient.pregnant.trimester': 'Trimester',
      'patient.phone': 'Phone Number',
      'patient.address': 'Address',
      'patient.temperature': 'Temperature',
      'patient.pulse': 'Pulse',
      'patient.weight': 'Weight',
      'patient.preExistingConditions': 'Pre-existing Conditions',
      'specimen.collectionDate': 'Specimen Collection Date',
      'specimen.id': 'Specimen ID',
      'antiviral.exposure': 'Antiviral Exposure',
      'antiviral.name': 'Antiviral Name',
      'antiviral.source': 'Antiviral Source',
      'symptoms': 'Symptoms',
      'symptoms.name': 'Symptom Name',
      'symptoms.count': 'Symptom Count',
      'diagnoses': 'Diagnoses',
      'diagnoses.name': 'Diagnosis Name',
      'diagnoses.count': 'Diagnosis Count',
      'disposition': 'Disposition',
      'disposition.name': 'Disposition Name',
      'disposition.count': 'Disposition Count',
      'visitType': 'Visit Type',
      'notes': 'Notes'
    }
  },
  outputDateFormat: 'YYYY-MM-DD',
  exportFormats: ['vertical', 'flat', 'custom']
};
