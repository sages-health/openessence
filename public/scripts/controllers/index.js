'use strict';

module.exports = {
  entry: require('./EntryCtrl'),
  login: require('./LoginCtrl'),
  main: require('./MainCtrl'),
  notFound: require('./NotFoundCtrl'),
  relogin: require('./ReloginCtrl'),
  report: require('./ReportCtrl'),
  visitEntry: require('./entry/VisitEntryCtrl')
};
