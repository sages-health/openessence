'use strict';

var angular = require('angular');

// @ngInject
module.exports = function ($scope, $window, $timeout, $log, Report, visualization, $document, updateURL) {

  $scope.report = $window.opener.report;
  $scope.state = angular.copy($window.opener.state);
  $scope.state.options.labels = $scope.state.options.labels || {};
  $scope.state.options.showNotes = true;

  $scope.state.options.labels.notes = $scope.state.queryString;

  $scope.export = function () {
    var status = 0;
    var pad = 10;
    var filename = $scope.state.options.labels.title.replace(/ /g, '_');
    var size = (pad + angular.element('#svg-id-' + $scope.state.options.id).width()) + 'px*' + (pad + angular.element('#export-div').height()) + 'px';
    var lang = $document[0].documentElement.lang;
    var cstate = angular.copy($scope.state);

    if(!cstate.options.showNotes){
      cstate.options.labels.notes = '';
    } else{
      var encodedNotes = btoa(cstate.options.labels.notes);
      cstate.options.labels.notes = encodedNotes;
    }
    updateURL.updateVisualization($scope.state.options.id, cstate);

    var state = updateURL.getStateString();

    Report.update({
      size: size,
      name: filename,
      url: '/' + lang + '/visualization-report?state=' + state
    }).$promise
      .catch(function () {
        status = 1;
        $log.error('Error saving report');
      })
      .then(function () { // download file
        // TODO: extension is currently specified implicitly? routes.js determines it (currently png)
        $timeout(function () {
          $window.location = '/reports/' + encodeURIComponent(filename);
        }, 500);
      });
  };

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
