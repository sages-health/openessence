'use strict';

module.exports = {
  login: require('./LoginCtrl'),
  main: require('./MainCtrl'),
  notFound: require('./NotFoundCtrl'),
  relogin: require('./ReloginCtrl'),
  report: require('./ReportCtrl'),
  reportVisitsWindow: require('./reports/VisitsReportCtrl'),
  workbench: require('./WorkbenchCtrl'),
  districtEdit: require('./edit/DistrictEditCtrl') ,
  symptomEdit: require('./edit/SymptomEditCtrl')  ,
  diagnosisEdit: require('./edit/DiagnosisEditCtrl'),
  syndromeEdit: require('./edit/SyndromeEditCtrl'),
  dischargeEdit: require('./edit/DischargeEditCtrl'),
  visitTypeEdit: require('./edit/VisitTypeEditCtrl'),
  userEdit: require('./edit/UserEditCtrl')
};
