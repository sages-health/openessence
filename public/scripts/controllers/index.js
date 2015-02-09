'use strict';

require('../modules').controllers
  // edit controllers
  .controller('DashboardEditCtrl', require('./edit/DashboardEditCtrl'))
  .controller('UserEditCtrl', require('./edit/UserEditCtrl'))
  .controller('VisualizationEditCtrl', require('./edit/VisualizationEditCtrl'))
  .controller('VisualizationExportCtrl', require('./VisualizationExportCtrl'))
  .controller('WorkbenchEditCtrl', require('./edit/WorkbenchEditCtrl'))

  // report controllers
  .controller('TimeseriesReportCtrl', require('./reports/TimeseriesReportCtrl'))
  .controller('VisitsReportCtrl', require('./reports/VisitsReportCtrl'))
  .controller('WeeklyReportCtrl', require('./reports/WeeklyReportCtrl'))
  .controller('VisualizationReportCtrl', require('./reports/VisualizationReportCtrl'))

  // everything else
  .controller('LoginCtrl', require('./LoginCtrl'))
  .controller('MainCtrl', require('./MainCtrl'))
  .controller('NotFoundCtrl', require('./NotFoundCtrl'))
  .controller('ReportCtrl', require('./ReportCtrl'))
  .controller('WorkbenchCtrl', require('./WorkbenchCtrl'))
  .controller('VisualizationExportCtrl', require('./VisualizationExportCtrl'));
