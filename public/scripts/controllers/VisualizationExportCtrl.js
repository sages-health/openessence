'use strict';

var angular = require('angular');

// @ngInject
module.exports = function ($scope, $window, $timeout, $log, Report, visualization, $document, updateURL) {

  $scope.state = angular.copy($window.opener.state);
  console.log($scope.state);
  $scope.state.options.labels = $scope.state.options.labels || {};
  $scope.state.options.showNotes = true;

  $scope.state.options.labels.notes = $scope.state.queryString;
  $scope.state.options.labels.title = $scope.state.options.labels.title || 'Export';

  $scope.export = function () {
    var pad = 10;
    var title = $scope.state.options.labels.title.replace(/ /g, '_');
    var size = (pad + $scope.state.options.width) + 'px*' + (pad + angular.element('#export-div').height()) + 'px';
    var lang = $document[0].documentElement.lang;
    var cstate = angular.copy($scope.state);

    if (!cstate.options.showNotes) {
      cstate.options.labels.notes = '';
    } else {
      var encodedNotes = btoa(cstate.options.labels.notes);
      cstate.options.labels.notes = encodedNotes;
    }
    updateURL.updateVisualization($scope.state.options.id, cstate);

    $window.location = '/reports/' + title + '?size=' + size + '&name=' + title + '&url=/' + lang +
    '/visualization-report?state=' + updateURL.getStateString();
  };

  // TODO these aren't needed anymore since we don't let the user specify the filename
  $scope.filenameInvalid = function (name) {
    var re = /[#%&{}\\<>*?/$!'":;,@+`|=~\]\[]+/g;
    name = name || '';
    return (name.length === 0 || re.test(name));
  };
  $scope.warnUserOfInvalidName = function (name) {
    var re = /[#%&{}\\<>*?/$!'":;,@+`|=~\]\[]+/g;
    name = name || '';
    return re.test(name);
  };

  $scope.cancel = function () {
    $window.close();
  };

};
