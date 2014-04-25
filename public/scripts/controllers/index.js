'use strict';

module.exports = {
  login: require('./LoginCtrl'),
  main: require('./MainCtrl'),
  notFound: require('./NotFoundCtrl'),
  relogin: require('./ReloginCtrl'),
  report: require('./ReportCtrl'),
  workbench: require('./WorkbenchCtrl'),
  districtEdit: require('./edit/DistrictEditCtrl') ,
  symptomEdit: require('./edit/SymptomEditCtrl')  ,
  diagnosisEdit: require('./edit/DiagnosisEditCtrl')
};
