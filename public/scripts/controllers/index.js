'use strict';

require('../modules').controllers
  // edit controllers
  .controller('AggregateDataEditCtrl', require('./edit/AggregateDataEditCtrl'))
  .controller('DashboardEditCtrl', require('./edit/DashboardEditCtrl'))
  .controller('DischargeEditCtrl', require('./edit/AggregateDataEditCtrl'))
  .controller('AggregateDataEditCtrl', require('./edit/DischargeEditCtrl'))
  .controller('DistrictEditCtrl', require('./edit/DistrictEditCtrl'))
  .controller('SymptomEditCtrl', require('./edit/SymptomEditCtrl'))
  .controller('SyndromeEditCtrl', require('./edit/SyndromeEditCtrl'))
  .controller('UserEditCtrl', require('./edit/UserEditCtrl'))
  .controller('VisitTypeEditCtrl', require('./edit/VisitTypeEditCtrl'))
  .controller('VisualizationEditCtrl', require('./edit/VisualizationEditCtrl'))
  .controller('WorkbenchEditCtrl', require('./edit/WorkbenchEditCtrl'))

  // report controllers
  .controller('TimeseriesReportCtrl', require('./reports/TimeseriesReportCtrl'))
  .controller('VisitsReportCtrl', require('./reports/VisitsReportCtrl'))
  .controller('WeeklyReportCtrl', require('./reports/WeeklyReportCtrl'))

  // everything else
  .controller('LoginCtrl', require('./LoginCtrl'))
  .controller('MainCtrl', require('./MainCtrl'))
  .controller('NotFoundCtrl', require('./NotFoundCtrl'))
  .controller('ReloginCtrl', require('./ReloginCtrl'))
  .controller('ReportCtrl', require('./ReportCtrl'))
  .controller('WorkbenchCtrl', require('./WorkbenchCtrl'));
