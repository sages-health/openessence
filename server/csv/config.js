module.exports = {
  template: {
    id: undefined,
    medicalFacility: {
      name: undefined,
      location: {
        district: undefined,
        county: undefined
      }
    },
    patient: {
      sex: undefined,
      age: {
        years: undefined
      }
    },
    symptoms: [],
    diagnoses: [],
    visitDate: undefined,
    symptomOnsetDate: undefined,
    submissionDate: undefined
  },
  results: {
    expanded: {
      fields: ['id', 'visitDate', 'medicalFacility.name', 'medicalFacility.location.district', 'patient.sex', 'patient.age.years', 'symptoms.name', 'symptoms.count', 'diagnoses.name', 'diagnoses.count', 'symptomOnsetDate', 'submissionDate'],
      fieldNames: ['ID', 'Visit Date', 'Medical Facility', 'District', 'Sex', 'Age', 'Symptom', 'Symptom Count', 'Diagnosis', 'Diagnosis Count', 'Symptom Onset Date', 'Submission Date']
    },
    flat: {
      fields: ['id', 'visitDate', 'medicalFacility.name', 'medicalFacility.location.district', 'patient.sex', 'patient.age.years', 'symptoms', 'diagnoses', 'symptomOnsetDate', 'submissionDate'],
      fieldNames: ['ID', 'Visit Date', 'Medical Facility', 'District', 'Sex', 'Age', 'Symptoms', 'Diagnoses', 'Symptom Onset Date', 'Submission Date']
    }
  },
  outputDateFormat: 'YYYY-MM-DD',
  exportFormats: ['vertical', 'flat', 'custom']
};
