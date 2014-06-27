'use strict';

module.exports = {
  login: require('./LoginCtrl'),
  main: require('./MainCtrl'),
  notFound: require('./NotFoundCtrl'),
  relogin: require('./ReloginCtrl'),
  report: require('./ReportCtrl'),
  reportVisitsWindow: require('./reports/VisitsReportCtrl'),
  workbench: require('./WorkbenchCtrl'),
  dashboard: require('./DashboardCtrl'),
  customWidget: require('./CustomWidgetCtrl'),
  widgetSettingsCtrl: require('./WidgetSettingsCtrl'),
  districtEdit: require('./edit/DistrictEditCtrl') ,
  symptomEdit: require('./edit/SymptomEditCtrl')  ,
  diagnosisEdit: require('./edit/DiagnosisEditCtrl'),
  userEdit: require('./edit/UserEditCtrl')
};
