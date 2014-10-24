'use strict';

var angular = require('angular');

var modalCtrl = function ($scope, $modalInstance, $state, $log, Report, urlToSave, $timeout, $interval, $window, $location) {
  $scope.container = {}; // see https://github.com/angular-ui/bootstrap/issues/969
  $scope.state = urlToSave.state;
  $scope.ok = function () {
    var status = 0;
    var title = $scope.container.report.name.replace(/ /g, '_');

    $window.location = '/reports/' + title + '?size=1500px*1500px' + '&name=' + title + '&url=/' + urlToSave.lang +
      '/?state=' + urlToSave.state;

    angular.element('.modal-footer > button').css('display', 'none');
    angular.element('.modal-footer .progress').css('display', 'block');

    var loadingBar = angular.element('.modal-footer .progress .progress-bar'),
      updateInterval = 500,
      rnd = 0;

    var intId = 0;
    var updateProgressBar = function () {
      if (status >= 1) {
        $interval.cancel(intId);
      }
      if (status >= 0 && status < 0.25) {
        // Start out between 3 - 6% increments
        rnd = (Math.random() * (5 - 3 + 1) + 3) / 100;
      } else if (status >= 0.25 && status < 0.65) {
        // increment between 0 - 3%
        rnd = (Math.random() * 3) / 100;
      } else if (status >= 0.65 && status < 0.9) {
        // increment between 0 - 2%
        rnd = (Math.random() * 2) / 100;
      } else if (status >= 0.9 && status < 0.99) {
        // finally, increment it .5 %
        rnd = 0.005;
      } else {
        // after 99%, don't increment:
        rnd = 0;
      }
      status += rnd;
      loadingBar.css('width', Math.floor(status * 100) + '%');
    };
    intId = $interval(updateProgressBar, updateInterval);
  };

  $scope.download = function () {
    cleanUp();
  };

  $scope.cancel = function () {
    cleanUp();
  };

  /**
   * Dismiss the modal and reset the css so it is ready to be shown again later
   */
  function cleanUp () {
    $modalInstance.dismiss('cancel');
    angular.element('.modal-backdrop').remove();
    if ($scope.state) {
      $location.path('/').search({state: $scope.state});
    } else {
      $state.go('home.content');
    }

    $timeout(function () {
      angular.element('.modal-footer > button').css('display', 'inline');
    }, 1000); // dismissing the dialog takes a little and we dont want to show the user the save button again
  }

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
};
// b/c ngmin doesn't like anonymous controllers
modalCtrl.$inject = ['$scope', '$modalInstance', '$state', '$log', 'Report', 'urlToSave',
                     '$timeout', '$interval', '$window', '$location'];

// @ngInject
module.exports = function ($scope, $modal, $stateParams, $window, $document, updateURL) {
  $modal.open({
    template: require('../../partials/save-report-dialog.html'),
    controller: modalCtrl,
    scope: $scope,
    resolve: {
      'urlToSave': function () {

        var lang = $document[0].documentElement.lang;
        var state = updateURL.getStateString();

        return {lang: lang, state: state};//$window.decodeURIComponent($stateParams.url);
      }
    }
  });
};
